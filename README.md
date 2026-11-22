# Connectus — Campus Events & Community Platform

Poster-first college event discovery, smart eligibility-filtered alerts, squad formation, and campus review workflows for students, club leaders, and college officials.

## 🚀 Key Features

- **🎓 Student Discovery & Filtering**: Browse hackathons, workshops, cultural fests, and talks filtered by Hyderabad area, radius, campus, branch, year, and skills.
- **🖼️ Poster-to-Event AI Extraction**: Upload an event poster image to extract structured fields, IST datetimes, fees, and venue automatically using Google Gemini AI (`@google/genai`).
- **🎟️ QR Passes & Gate Check-In**: Instant registration, digital QR entry passes, and live camera QR scanner check-in for organizers.
- **🤝 Squads & Real-Time Chat**: Form event squads, recruit teammates filtered by skills and roles, and collaborate over live WebSockets (`/ws/team-chat`).
- **🏛️ Role-Based Campus Portals**: Dedicated workspaces for **Students**, **Club Leaders** (drafting & poster uploads), and **Campus Officials** (review & approval queue).

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons
- **Backend**: Node.js, Express, WebSockets (`ws`), REST APIs
- **AI & Vision**: Google Gemini API (`@google/genai`) for poster OCR and feedback clustering
- **Database & Auth**: Google Firebase (Authentication & Cloud Firestore)
- **Mobile**: React Native, Expo SDK
