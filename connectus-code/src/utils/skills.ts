import type { CampusEvent, StudentProfile } from '../types';

export interface PresetSkillDef {
  id: string;
  label: string;
  category: 'Design' | 'Engineering' | 'AI & Data' | 'Product & Biz' | 'Campus & Arts';
  keywords: string[];
}

export const PRESET_SKILLS: PresetSkillDef[] = [
  {
    id: 'ui-ux',
    label: 'UI/UX Design',
    category: 'Design',
    keywords: [
      'ui/ux',
      'ui ux',
      'ux',
      'ui',
      'user experience',
      'user interface',
      'figma',
      'prototyping',
      'design systems',
      'wireframe',
      'behance',
      'pixelcraft',
      'product design',
    ],
  },
  {
    id: 'product-design',
    label: 'Product Design',
    category: 'Design',
    keywords: [
      'product design',
      'design',
      'figma',
      'design systems',
      'portfolio',
      'conclave',
      'critique',
      'creative',
    ],
  },
  {
    id: 'ai-ml',
    label: 'AI / ML',
    category: 'AI & Data',
    keywords: [
      'ai',
      'ml',
      'machine learning',
      'genai',
      'llm',
      'multimodal',
      'inference',
      'neural',
      'rag',
      'vernacular ai',
      'iqx24',
      'hackathon',
    ],
  },
  {
    id: 'fullstack-web',
    label: 'Full-Stack Web',
    category: 'Engineering',
    keywords: [
      'full-stack',
      'fullstack',
      'web',
      'react',
      'node',
      'postgres',
      'serverless',
      'cloud jam',
      'typescript',
      'javascript',
    ],
  },
  {
    id: 'frontend-react',
    label: 'React & Frontend',
    category: 'Engineering',
    keywords: [
      'react',
      'frontend',
      'web',
      'tailwind',
      'next.js',
      'typescript',
      'ui',
      'full-stack',
    ],
  },
  {
    id: 'backend-cloud',
    label: 'Backend & Cloud',
    category: 'Engineering',
    keywords: [
      'backend',
      'cloud',
      'postgres',
      'docker',
      'serverless',
      'queues',
      'devops',
      'api',
      'node.js',
    ],
  },
  {
    id: 'systems-rust-cpp',
    label: 'Systems / Rust & C++',
    category: 'Engineering',
    keywords: [
      'rust',
      'c++',
      'systems',
      'low-latency',
      'distributed',
      'gpu',
      'inference',
      'edge computing',
    ],
  },
  {
    id: 'robotics-iot',
    label: 'Robotics & IoT',
    category: 'Engineering',
    keywords: [
      'robotics',
      'ros2',
      'lidar',
      'drone',
      'autonomous',
      'sensor',
      'hardware',
      'embedded',
      'iot',
    ],
  },
  {
    id: 'cybersecurity',
    label: 'Cybersecurity & CTF',
    category: 'Engineering',
    keywords: [
      'cybersecurity',
      'ctf',
      'capture the flag',
      'security',
      'osint',
      'crypto',
      'pentest',
    ],
  },
  {
    id: 'competitive-coding',
    label: 'Competitive Programming',
    category: 'Engineering',
    keywords: [
      'icpc',
      'competitive programming',
      'codeforces',
      'algorithms',
      'dsa',
      'coding',
      'c++',
    ],
  },
  {
    id: 'data-science',
    label: 'Data Science & Analytics',
    category: 'AI & Data',
    keywords: [
      'data science',
      'analytics',
      'python',
      'sql',
      'machine learning',
      'data',
      'ai',
    ],
  },
  {
    id: 'fintech-product',
    label: 'FinTech & Startup Pitch',
    category: 'Product & Biz',
    keywords: [
      'fintech',
      'startup',
      'pitch',
      'founders',
      'e-cell',
      'upi',
      'case',
      'entrepreneurship',
      'business',
      'builders',
      'product',
    ],
  },
  {
    id: 'mobile-dev',
    label: 'Mobile & App Dev',
    category: 'Engineering',
    keywords: [
      'mobile',
      'android',
      'ios',
      'flutter',
      'react native',
      'app',
      'hackathon',
    ],
  },
  {
    id: 'cultural-arts',
    label: 'Cultural, Music & Arts',
    category: 'Campus & Arts',
    keywords: [
      'cultural',
      'music',
      'band',
      'folk',
      'theatre',
      'arts',
      'fest',
      'sankalp',
    ],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[/&,+_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getKeywordsForSkill(skill: string): string[] {
  const norm = normalizeText(skill);
  if (!norm) return [];

  const matchedPreset = PRESET_SKILLS.find((preset) => {
    const presetNorm = normalizeText(preset.label);
    return (
      presetNorm === norm ||
      preset.keywords.some((kw) => normalizeText(kw) === norm)
    );
  });

  if (matchedPreset) {
    return Array.from(
      new Set([norm, ...matchedPreset.keywords.map(normalizeText)])
    );
  }

  const tokens = norm.split(' ').filter((t) => t.length >= 2);
  return Array.from(new Set([norm, ...tokens]));
}

function containsKeyword(haystack: string, keyword: string): boolean {
  if (!keyword || !haystack) return false;
  if (keyword.length <= 2) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(haystack);
  }
  return haystack.includes(keyword);
}

export function buildEventSearchHaystack(event: CampusEvent): string {
  const chunks = [
    event.title,
    event.description,
    event.type,
    event.clubName,
    ...(event.prizesAndPerks || []),
    ...(event.prerequisites || []),
    ...(event.rules || []),
    ...(event.branches || []),
  ];
  return normalizeText(chunks.join(' '));
}

export interface StudentEventMatchResult {
  matchedSkills: string[];
  matchedGoals: string[];
  skillBoost: number;
  matchReason: string | null;
  seatsLeft: number;
  fillRatio: number;
  isFillingFast: boolean;
  urgencyLabel: string | null;
}

export function evaluateStudentEventMatch(
  student: Pick<
    StudentProfile,
    'skills' | 'learningGoals' | 'preferredModes'
  >,
  event: CampusEvent
): StudentEventMatchResult {
  const haystack = buildEventSearchHaystack(event);
  const currentSkills = Array.isArray(student.skills) ? student.skills : [];
  const goals = Array.isArray(student.learningGoals) ? student.learningGoals : [];

  const matchedSkills: string[] = [];
  for (const skill of currentSkills) {
    const keywords = getKeywordsForSkill(skill);
    if (keywords.some((kw) => containsKeyword(haystack, kw))) {
      matchedSkills.push(skill);
    }
  }

  const matchedGoals: string[] = [];
  for (const goal of goals) {
    if (matchedSkills.some((s) => normalizeText(s) === normalizeText(goal))) {
      continue;
    }
    const keywords = getKeywordsForSkill(goal);
    if (keywords.some((kw) => containsKeyword(haystack, kw))) {
      matchedGoals.push(goal);
    }
  }

  let skillBoost = 0;
  if (matchedSkills.length > 0) {
    skillBoost += Math.min(90, 55 + (matchedSkills.length - 1) * 15);
  }
  if (matchedGoals.length > 0) {
    skillBoost += Math.min(72, 42 + (matchedGoals.length - 1) * 12);
  }
  if (
    Array.isArray(student.preferredModes) &&
    student.preferredModes.length > 0 &&
    student.preferredModes.includes(event.mode)
  ) {
    skillBoost += 10;
  }

  const capacity = Math.max(1, event.capacity);
  const seatsLeft = Math.max(0, capacity - event.confirmedCount);
  const fillRatio = Math.min(1, Math.max(0, event.confirmedCount / capacity));
  const isFillingFast =
    event.regStatus === 'open' &&
    event.status === 'published' &&
    seatsLeft > 0 &&
    (fillRatio >= 0.7 || seatsLeft <= 15);

  if ((matchedSkills.length > 0 || matchedGoals.length > 0) && isFillingFast) {
    skillBoost += 18;
  }

  let matchReason: string | null = null;
  if (matchedSkills.length > 0) {
    matchReason = `Matches ${matchedSkills[0]}`;
  } else if (matchedGoals.length > 0) {
    matchReason = `Learn ${matchedGoals[0]}`;
  }

  let urgencyLabel: string | null = null;
  if (isFillingFast) {
    const pctFull = Math.round(fillRatio * 100);
    urgencyLabel =
      seatsLeft <= 5
        ? `Only ${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left (${pctFull}% full)`
        : `Filling fast · ${seatsLeft} seats left (${pctFull}% full)`;
  }

  return {
    matchedSkills,
    matchedGoals,
    skillBoost,
    matchReason,
    seatsLeft,
    fillRatio,
    isFillingFast,
    urgencyLabel,
  };
}
