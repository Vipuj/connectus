# Connectus

Poster-first college event discovery, smart eligibility-filtered alerts, squad formation, and campus review workflows for students, club leaders, and college officials.

## Key Features

- **Student Discovery & Filtering**: Browse hackathons, workshops, cultural fests, and talks filtered by Hyderabad area, radius, campus, branch, year, skills, and mode, with vertical Reels previews and Google Maps / area views.
- **Poster-to-Event AI Extraction**: Upload an event poster image to extract structured fields, IST datetimes, fees, capacity, and confidence scores using Gemini (`@google/genai`), with manual editing and sample posters built in.
- **QR Passes & Gate Check-In**: Instant registration, waitlist tracking, generated `CONNECTUS:V1` QR passes, and live camera QR scanner check-in for organizers.
- **Squads & Real-Time Team-Up Chat**: Create squads, publish teammate calls filtered by skills/roles/areas/languages, manage join requests, and collaborate over WebSocket (`/ws/team-chat`) + Firestore.
- **Role-Based Campus Portals**: Dedicated workspaces for **Students**, **Club Leaders** (event submissions, promos, feedback, scanner), and **Campus Officials** (review & approval queue, announcements, surveys, clubs & members, AI-assisted feedback clustering).
- **Notifications & Telegram Simulator**: Automated 24h/2h reminders, deadline alerts, quiet hours, daily digest, and an in-app `@ConnectusBot` drawer (with optional live Telegram Bot API dispatch).
- **Warm Paper Light & Charcoal Dark Mode**: System, Light, and Dark modes (`Charcoal #141414`, `Black #050505`, `Grey #232323`) with per-account persistence across sessions.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Motion, Lucide Icons
- **Backend**: Node.js, Express 4, `ws` WebSockets, `tsx`
- **Database & Auth**: Firebase Authentication (Google Sign-In), Cloud Firestore + local auto-seeded JSON store (`data/campuspulse-db.json`, gitignored)
- **AI**: Google GenAI SDK (`@google/genai`)

## Quick Start (Local Demo)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Set `GEMINI_API_KEY` in `.env` if you want live AI poster extraction and Gemini feedback clustering. All other variables are optional—the demo includes automatic fallback behavior and seeded campus events.

3. **Run the development server**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`. On first boot, the server automatically seeds a clean demo dataset into `data/campuspulse-db.json`.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Express + Vite middleware + WebSocket server on port `3000` |
| `npm run build` | Builds the production frontend into `dist/` |
| `npm start` | Runs the production server (`NODE_ENV=production`) serving `dist/` |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |
| `npm test` | Runs end-to-end API flow verification (`scripts/verify-flows.ts`) against `http://127.0.0.1:3000` |

## Firebase Notes

- `firebase-applet-config.json` contains public Firebase Web SDK configuration (safe for client bundles).
- If you run Google Sign-In on a new domain (such as `localhost` or a custom hosting URL), add that domain under **Firebase Console → Authentication → Settings → Authorized domains**.
- Firestore security rules live in `firestore.rules`.
