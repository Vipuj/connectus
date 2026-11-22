import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  EventType,
  FeedbackAnalysisReport,
  PosterExtractionResult,
} from '../src/types';
import { HYDERABAD_AREAS, loadDb, saveDb } from './store';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Simple per-user rate limiter (10 uploads per minute per blueprint loophole #19)
const uploadTimestamps: number[] = [];

export function checkUploadRateLimit(): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  while (uploadTimestamps.length > 0 && uploadTimestamps[0] < windowStart) {
    uploadTimestamps.shift();
  }
  if (uploadTimestamps.length >= 10) {
    return false;
  }
  uploadTimestamps.push(now);
  return true;
}

export function computeImageHash(base64Data: string): string {
  return crypto.createHash('sha256').update(base64Data).digest('hex').slice(0, 24);
}

export function resolveLocalPosterToBase64(imagePath: string): { base64: string; mimeType: string } {
  const safeRelative = imagePath.replace(/^\/+/, '');
  const fullPath = path.resolve(process.cwd(), safeRelative);
  if (!fullPath.startsWith(path.resolve(process.cwd(), 'src/assets/images'))) {
    throw new Error('Invalid sample poster path.');
  }
  const buffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { base64: buffer.toString('base64'), mimeType };
}

export async function extractPosterWithGemini(params: {
  base64Image: string;
  mimeType: string;
  uploadDateIso: string;
  organizerCollegeName: string;
}): Promise<PosterExtractionResult> {
  const startedAt = Date.now();
  const cleanBase64 = params.base64Image.includes(',')
    ? params.base64Image.split(',')[1]
    : params.base64Image;

  const imageHash = computeImageHash(cleanBase64);
  const db = loadDb();
  if (db.extractionCache[imageHash]) {
    return {
      ...db.extractionCache[imageHash],
      cached: true,
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not configured in Secrets. Please set your Gemini API key or use the manual entry form.'
    );
  }

  const areaList = HYDERABAD_AREAS.map((a) => `${a.id}: ${a.name}`).join(', ');
  const systemInstruction = `You are an expert event poster extraction engine for Connectus.
Analyze the uploaded image carefully. Posters may be in English, Telugu, Hindi, or mixed-language (transliterated/bilingual), and may contain multiple events or may not be an event poster at all.

Strict Extraction Rules:
1. If the image is NOT an event poster (e.g., selfie, receipt, meme, blank page, food menu), set is_event_poster to false and populate warnings.
2. If the poster lists MULTIPLE distinct events on a schedule/brochure, set multiple_events to true, extract ONLY the first primary event, and add a warning explaining multiple events were detected.
3. NEVER invent values. Use null for any field not explicitly printed or clearly implied on the poster.
4. Indian date convention: always interpret numeric dates as dd/mm (day first, month second).
5. Relative dates ("this Saturday", "tomorrow") or missing years: resolve relative to upload_date (${params.uploadDateIso}). If the year is missing or printed as an older past year on a sample template, infer the nearest upcoming future date in late 2026 relative to ${params.uploadDateIso} ONLY if clearly needed, AND add a warning noting the year was missing or adjusted so the organizer verifies it (set confidence for start_datetime_ist <= 0.65 whenever inferred!).
6. Format all datetimes in IST as "YYYY-MM-DDTHH:mm" (24-hour local IST time).
7. Map area_guess to the closest Hyderabad area ID from this list if known: [${areaList}], or null if unknown.
8. Return per-field confidence scores between 0.0 and 1.0 (use < 0.7 whenever text is blurry, inferred, partial, or missing).
9. Keep description concise (under 280 characters), factual, and written in clean English.`;

  const promptText = `Upload Date (IST): ${params.uploadDateIso}
Organizer's College Context: ${params.organizerCollegeName}
Extract the structured event details from this poster image.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: cleanBase64,
          },
        },
        { text: promptText },
      ],
    },
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_event_poster: { type: Type.BOOLEAN },
          multiple_events: { type: Type.BOOLEAN },
          title: { type: Type.STRING, nullable: true },
          type: {
            type: Type.STRING,
            nullable: true,
            description: 'One of: Hackathon, Workshop, Talk, Cultural, Competition, Meetup',
          },
          start_datetime_ist: {
            type: Type.STRING,
            nullable: true,
            description: 'YYYY-MM-DDTHH:mm in IST',
          },
          end_datetime_ist: {
            type: Type.STRING,
            nullable: true,
            description: 'YYYY-MM-DDTHH:mm in IST',
          },
          venue_name: { type: Type.STRING, nullable: true },
          area_guess: { type: Type.STRING, nullable: true },
          mode: {
            type: Type.STRING,
            nullable: true,
            description: 'One of: In-Person, Hybrid, Online',
          },
          audience: {
            type: Type.STRING,
            nullable: true,
            description: 'One of: open_to_all, host_college_only',
          },
          branches: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          years: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          fee_inr: { type: Type.NUMBER, nullable: true },
          capacity: { type: Type.INTEGER, nullable: true },
          registration_deadline_ist: {
            type: Type.STRING,
            nullable: true,
            description: 'YYYY-MM-DDTHH:mm in IST',
          },
          registration_link: { type: Type.STRING, nullable: true },
          organizer_name: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING, nullable: true },
          language: { type: Type.STRING },
          confidence: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.NUMBER },
              type: { type: Type.NUMBER },
              start_datetime_ist: { type: Type.NUMBER },
              end_datetime_ist: { type: Type.NUMBER },
              venue_name: { type: Type.NUMBER },
              fee_inr: { type: Type.NUMBER },
              registration_deadline_ist: { type: Type.NUMBER },
              registration_link: { type: Type.NUMBER },
              capacity: { type: Type.NUMBER },
            },
          },
          warnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['is_event_poster', 'multiple_events', 'language', 'confidence', 'warnings'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as PosterExtractionResult;

  // Code-side sanity checks & normalization
  const warnings = Array.isArray(parsed.warnings) ? [...parsed.warnings] : [];
  if (parsed.registration_link && !parsed.registration_link.startsWith('https://')) {
    if (parsed.registration_link.startsWith('http://')) {
      warnings.push('Registration URL on poster was HTTP; please verify HTTPS link.');
    } else if (!parsed.registration_link.includes('.')) {
      parsed.registration_link = null;
    } else {
      parsed.registration_link = `https://${parsed.registration_link}`;
      parsed.confidence = { ...parsed.confidence, registration_link: 0.6 };
      warnings.push('Added https:// prefix to extracted URL — verify before publishing.');
    }
  }

  if (parsed.start_datetime_ist) {
    const parsedStart = new Date(`${parsed.start_datetime_ist}:00+05:30`);
    if (isNaN(parsedStart.getTime())) {
      warnings.push('Extracted start date/time could not be parsed cleanly. Please verify.');
      parsed.confidence = { ...parsed.confidence, start_datetime_ist: 0.4 };
    } else if (parsedStart.getTime() < Date.now()) {
      warnings.push('Date printed on poster appears to be in the past. Update to upcoming IST date before publishing.');
      parsed.confidence = { ...parsed.confidence, start_datetime_ist: 0.45 };
    }
  } else if (parsed.is_event_poster) {
    parsed.confidence = { ...parsed.confidence, start_datetime_ist: 0.2 };
    warnings.push('Start date/time was not clearly found on the poster.');
  }

  if (parsed.capacity !== null && parsed.capacity !== undefined && parsed.capacity <= 0) {
    parsed.capacity = null;
  }

  const normalized: PosterExtractionResult = {
    is_event_poster: Boolean(parsed.is_event_poster),
    multiple_events: Boolean(parsed.multiple_events),
    title: parsed.title ?? null,
    type: parsed.type ?? 'Workshop',
    start_datetime_ist: parsed.start_datetime_ist ?? null,
    end_datetime_ist: parsed.end_datetime_ist ?? null,
    venue_name: parsed.venue_name ?? null,
    area_guess: parsed.area_guess ?? null,
    mode: parsed.mode ?? 'In-Person',
    audience: parsed.audience ?? 'open_to_all',
    branches: parsed.branches?.length ? parsed.branches : ['All'],
    years: parsed.years?.length ? parsed.years : ['All'],
    fee_inr: parsed.fee_inr ?? null,
    capacity: parsed.capacity ?? null,
    registration_deadline_ist: parsed.registration_deadline_ist ?? null,
    registration_link: parsed.registration_link ?? null,
    organizer_name: parsed.organizer_name ?? null,
    description: parsed.description ? parsed.description.slice(0, 300) : null,
    language: parsed.language || 'English',
    confidence: parsed.confidence || {},
    warnings,
    cached: false,
    latencyMs: Date.now() - startedAt,
  };

  db.extractionCache[imageHash] = normalized;
  saveDb(db);
  return normalized;
}

export async function analyzeCampusFeedbackWithGemini(params: {
  scope: 'campus' | 'club' | 'event';
  scopeLabel: string;
  feedbackItems: Array<{
    eventTitle: string;
    eventType: EventType;
    rating: number;
    requestedCategory?: string;
    comment: string;
    suggestion?: string;
    complaint?: string;
  }>;
  surveyResponses: Array<{
    surveyTitle: string;
    rating?: number;
    selectedOption?: string;
    responseText: string;
  }>;
}): Promise<FeedbackAnalysisReport> {
  const totalFeedbackCount = params.feedbackItems.length;
  const totalSurveyResponseCount = params.surveyResponses.length;
  const totalItems = totalFeedbackCount + totalSurveyResponseCount;

  const ratedFeedback = params.feedbackItems.filter(
    (f) => typeof f.rating === 'number' && f.rating >= 1 && f.rating <= 5
  );
  const averageRating =
    ratedFeedback.length > 0
      ? Number(
          (
            ratedFeedback.reduce((sum, item) => sum + item.rating, 0) / ratedFeedback.length
          ).toFixed(1)
        )
      : null;

  // Deterministic sentiment counts derived from real ratings + survey ratings (never fabricated)
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const item of params.feedbackItems) {
    if (item.rating >= 4) positive += 1;
    else if (item.rating === 3) neutral += 1;
    else negative += 1;
  }
  for (const resp of params.surveyResponses) {
    if (typeof resp.rating === 'number') {
      if (resp.rating >= 4) positive += 1;
      else if (resp.rating === 3) neutral += 1;
      else negative += 1;
    } else {
      neutral += 1;
    }
  }

  const limitationNotice =
    'Privacy & Scope Notice: Analysis runs only over anonymized feedback and survey text submitted by participants in this scope (names, emails, UIDs, and roll numbers are stripped). Theme counts are bounded by actual submitted entries.';

  if (totalItems === 0) {
    return {
      scope: params.scope,
      scopeLabel: params.scopeLabel,
      analyzedAt: new Date().toISOString(),
      totalFeedbackCount: 0,
      totalSurveyResponseCount: 0,
      averageRating: null,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      commonComplaints: [],
      requestedCategories: [],
      recurringSuggestions: [],
      crossEventTrends: [],
      summaryNote:
        'No student feedback or survey responses have been submitted in this scope yet. AI insights will populate automatically once participants submit ratings, comments, or survey answers.',
      limitationNotice,
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    // Clean deterministic fallback if GEMINI_API_KEY is absent in a local environment
    const categoryCounts = new Map<string, number>();
    const complaintExamples: string[] = [];
    const suggestionExamples: string[] = [];
    for (const f of params.feedbackItems) {
      if (f.requestedCategory?.trim()) {
        const key = f.requestedCategory.trim();
        categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
      }
      if (f.complaint?.trim()) complaintExamples.push(f.complaint.trim().slice(0, 140));
      if (f.suggestion?.trim()) suggestionExamples.push(f.suggestion.trim().slice(0, 140));
    }
    for (const s of params.surveyResponses) {
      if (s.selectedOption?.trim()) {
        const key = s.selectedOption.trim();
        categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
      }
      if (s.responseText?.trim()) suggestionExamples.push(s.responseText.trim().slice(0, 140));
    }
    return {
      scope: params.scope,
      scopeLabel: params.scopeLabel,
      analyzedAt: new Date().toISOString(),
      totalFeedbackCount,
      totalSurveyResponseCount,
      averageRating,
      sentimentBreakdown: { positive, neutral, negative },
      commonComplaints:
        complaintExamples.length > 0
          ? [
              {
                theme: 'Reported Operational Concerns',
                count: complaintExamples.length,
                examples: complaintExamples.slice(0, 3),
              },
            ]
          : [],
      requestedCategories: Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      recurringSuggestions:
        suggestionExamples.length > 0
          ? [
              {
                theme: 'Student Suggestions & Survey Requests',
                count: suggestionExamples.length,
                examples: suggestionExamples.slice(0, 3),
              },
            ]
          : [],
      crossEventTrends: [
        `Compiled directly from ${totalFeedbackCount} event feedback submission(s) and ${totalSurveyResponseCount} survey response(s) without Gemini key active.`,
      ],
      summaryNote: `Analyzed ${totalItems} real student submission(s) across ${params.scopeLabel}.`,
      limitationNotice,
    };
  }

  const anonymizedPayload = {
    scope: params.scope,
    scopeLabel: params.scopeLabel,
    eventFeedback: params.feedbackItems.slice(0, 120).map((item, idx) => ({
      id: `fb-${idx + 1}`,
      eventTitle: item.eventTitle,
      eventType: item.eventType,
      rating: item.rating,
      requestedCategory: item.requestedCategory || null,
      comment: item.comment.slice(0, 320),
      suggestion: item.suggestion ? item.suggestion.slice(0, 240) : null,
      complaint: item.complaint ? item.complaint.slice(0, 240) : null,
    })),
    surveyResponses: params.surveyResponses.slice(0, 120).map((resp, idx) => ({
      id: `sr-${idx + 1}`,
      surveyTitle: resp.surveyTitle,
      rating: typeof resp.rating === 'number' ? resp.rating : null,
      selectedOption: resp.selectedOption || null,
      responseText: resp.responseText.slice(0, 320),
    })),
  };

  const systemInstruction = `You are a campus institutional analytics assistant for Connectus.
Analyze ONLY the provided anonymized student event feedback and survey responses.
Strict Rules:
1. NEVER invent feedback, statistics, ratings, or quotes that are not present in the input payload.
2. Every theme "count" MUST be <= the total number of matching entries in the input.
3. Include short verbatim or lightly trimmed anonymized excerpts (max 140 chars each) inside "examples", strictly grounded in the provided texts.
4. Cluster common complaints, frequently requested event categories/topics, recurring improvement suggestions, and cross-event trends concisely for campus decision-making.
5. Keep summaryNote to 2–3 clear factual sentences.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      {
        text: `Analyze these ${totalFeedbackCount} event feedback submissions and ${totalSurveyResponseCount} campus survey responses for ${params.scopeLabel}:\n${JSON.stringify(
          anonymizedPayload
        )}`,
      },
    ],
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          commonComplaints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                theme: { type: Type.STRING },
                count: { type: Type.INTEGER },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['theme', 'count', 'examples'],
            },
          },
          requestedCategories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                count: { type: Type.INTEGER },
              },
              required: ['category', 'count'],
            },
          },
          recurringSuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                theme: { type: Type.STRING },
                count: { type: Type.INTEGER },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['theme', 'count', 'examples'],
            },
          },
          crossEventTrends: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          summaryNote: { type: Type.STRING },
        },
        required: [
          'commonComplaints',
          'requestedCategories',
          'recurringSuggestions',
          'crossEventTrends',
          'summaryNote',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    commonComplaints?: Array<{ theme: string; count: number; examples: string[] }>;
    requestedCategories?: Array<{ category: string; count: number }>;
    recurringSuggestions?: Array<{ theme: string; count: number; examples: string[] }>;
    crossEventTrends?: string[];
    summaryNote?: string;
  };

  const clampThemes = (items?: Array<{ theme: string; count: number; examples: string[] }>) =>
    (items || [])
      .filter((t) => t && t.theme && t.count > 0)
      .slice(0, 6)
      .map((t) => ({
        theme: t.theme.trim(),
        count: Math.min(totalItems, Math.max(1, Math.round(t.count))),
        examples: (t.examples || []).map((ex) => ex.trim().slice(0, 140)).filter(Boolean).slice(0, 3),
      }));

  return {
    scope: params.scope,
    scopeLabel: params.scopeLabel,
    analyzedAt: new Date().toISOString(),
    totalFeedbackCount,
    totalSurveyResponseCount,
    averageRating,
    sentimentBreakdown: { positive, neutral, negative },
    commonComplaints: clampThemes(parsed.commonComplaints),
    requestedCategories: (parsed.requestedCategories || [])
      .filter((c) => c && c.category && c.count > 0)
      .slice(0, 8)
      .map((c) => ({
        category: c.category.trim(),
        count: Math.min(totalItems, Math.max(1, Math.round(c.count))),
      })),
    recurringSuggestions: clampThemes(parsed.recurringSuggestions),
    crossEventTrends: (parsed.crossEventTrends || [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6),
    summaryNote:
      parsed.summaryNote?.trim() ||
      `Analyzed ${totalFeedbackCount} event feedback submission(s) and ${totalSurveyResponseCount} survey response(s) for ${params.scopeLabel}.`,
    limitationNotice,
  };
}

