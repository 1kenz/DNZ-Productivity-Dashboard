<div align="center">

  <img src="public/icons/icon-512.png" alt="DNZ Productivity Logo" width="108" height="108" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />

  # DNZ Productivity Dashboard

  **Enterprise-grade, local-first productivity cockpit with Tasks, Kanban, Multi-Account Calendars, Deep-Work Focus Tools, and a Voice-Driven Multimodal AI Assistant.**

  [![Version](https://img.shields.io/badge/version-3.0.0-blue.svg?style=flat-square)](https://github.com/1kenz/dnz-productivity-dashboard/releases)
  [![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black.svg?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.2.3-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
  [![Electron](https://img.shields.io/badge/Electron-33-47848F.svg?style=flat-square&logo=electron)](https://www.electronjs.org/)
  [![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

  [🌐 Live Showcase Site](https://1kenz.github.io/dnz-productivity-dashboard/) • [🖥️ macOS App](#%EF%B8%8F-macos-desktop-app) • [🚀 Quickstart](#-getting-started) • [🔒 Security & Privacy](#-security--privacy-first)

</div>

---

## 📖 Overview

**DNZ Productivity Dashboard** is an all-in-one personal productivity workstation engineered for developers, security professionals, and power users. Designed with a strict **local-first, privacy-respecting philosophy**, all your tasks, calendar events, time logs, and notes stay within your control on your local machine.

Whether deployed via **Docker**, run locally in development, or installed as a standalone **native macOS `.dmg` app** with a bundled embedded PostgreSQL database, it delivers seamless speed and reliability with zero cloud lock-in.

---

## ✨ Key Features

### 🤖 Multimodal AI Assistant & Live Voice
- **Multi-Model Support**: Connect with **Google Gemini** (Gemini 2.5 Flash / Pro), **Anthropic Claude** (Claude 3.7 Sonnet), or **OpenAI** (GPT-4o).
- **Live Voice Assistant**: Real-time microphone capture with voice activity detection (VAD), speech-to-text (STT), and voice synthesis (TTS) for natural vocal conversations.
- **Live Web Search & Citations**: Automatic web-search grounded answers with clickable source footnotes.
- **SITREP Intelligence**: On-demand executive daily situational reports summarizing upcoming deadlines, schedule conflicts, and task priorities.
- **Turn AI into Action**: 1-click convert chat outputs into tasks or notes.

### 📋 Task Management & Interactive Kanban
- **Flexible Views**: Switch between customizable Task Lists and interactive Kanban boards.
- **Drag-and-Drop Workflow**: Move cards across To Do, In Progress, Review, and Done.
- **Priority & Deadlines**: Low, Medium, and High priority tags, color-coded badges, and intelligent due date alerts.
- **Recurring Tasks**: Daily, weekly, monthly, or cron-based task automation with pause/resume controls.
- **Attachments**: Link local files, documents, and programs directly to tasks.

### 📅 Unified Multi-Account Calendar
- **Cross-Platform Sync**: Full support for **Google Calendar** (OAuth 2.0) and **CalDAV** (Apple iCloud, Fastmail, Nextcloud).
- **Built-in Local Calendar**: Offline-capable native calendar events independent of third-party services.
- **Views**: Seamless switching between Day, Week, and Month grids with working-hours focus (06:00–18:00).

### ⏱️ Deep Work & Focus Tools
- **Pomodoro Timer**: Animated hourglass visual timer with customizable focus and break intervals.
- **Active Time Tracker**: Log project work hours with start/stop stopwatches and manual entry.
- **Analytics & Trends**: Interactive charts powered by **Recharts** displaying daily and weekly output.

### 🔗 Smart Quick Links & App Launcher
- **Group Organization**: Color-coded and icon-customized bookmark clusters with automatic favicon fetching.
- **Native macOS App & File Launcher**: Launch local applications, scripts, or files directly from your dashboard via native OS protocols.
- **Fast Command Palette**: Instant navigation across the entire workspace via `Cmd + K` or `Cmd + J`.

### ☁️ Cloud Backup & Data Mobility
- **Google Drive Sync**: Securely export encrypted database snapshots to Google Drive or restore state across machines.
- **Local JSON Export**: 1-click zero-dependency database backup and instant restore.

---

## 🖥️ macOS Desktop App

For macOS users, DNZ Productivity Dashboard offers a standalone, native desktop application (`.dmg`) bundled with **Electron** and an **embedded PostgreSQL 17** engine.

- **No Docker Required**: Spawns its own isolated, native PostgreSQL server on boot.
- **macOS Menu Bar (Tray)**: Dock and Menu Bar icon for instant access, quick notes, and Pomodoro controls even when the main window is closed.
- **Global Shortcuts**: System-wide `Cmd+K` Command Palette and `Cmd+J` Quick Notes.
- **Apple Silicon Native**: High performance on M1/M2/M3/M4 chips.

To build the standalone `.dmg` installer from source:

```bash
bash scripts/build_desktop_app.sh
```

---

## 🔒 Security & Privacy First

We believe productivity data is inherently sensitive. DNZ Productivity Dashboard is engineered with security at the forefront:

1. **Local-First Storage**: Your core database runs locally (PostgreSQL on port `5532` in Docker, or embedded locally in the macOS app).
2. **Zero Telemetry**: No third-party tracking scripts, analytics cookies, or behavioral telemetry.
3. **Bring Your Own Keys (BYOK)**: AI integrations use your personal API keys stored safely in your local environment or database; keys are never exposed in client bundles or public endpoints.
4. **Sandboxed OAuth**: Google Drive and Calendar sync use direct, scoped OAuth 2.0 authorizations with explicit consent.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (strict mode) |
| **Styling & Design System** | [Tailwind CSS 4](https://tailwindcss.com/), CSS Modules, Glassmorphism |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [Prisma ORM 7](https://www.prisma.io/) |
| **Desktop Platform** | [Electron 33](https://www.electronjs.org/), `embedded-postgres` |
| **Visualizations** | [Recharts 3](https://recharts.org/) |
| **Calendar Protocol** | [tsdav](https://github.com/natelindev/tsdav) (CalDAV / iCloud RFC 4791) |
| **Testing** | [Jest](https://jestjs.io/), [Testing Library](https://testing-library.com/), [Playwright](https://playwright.dev/) |

---

## 🚀 Getting Started

### Option A: Run via Docker Compose (Recommended)

The fastest way to run both the PostgreSQL database and the Next.js web application:

```bash
# 1. Clone the repository
git clone https://github.com/1kenz/dnz-productivity-dashboard.git
cd dnz-productivity-dashboard

# 2. Configure environment
cp .env.example .env

# 3. Start containers
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:9999` if using the dev compose config) in your browser.

---

### Option B: Local Node.js Development

```bash
# 1. Install dependencies
npm install

# 2. Prepare environment file
cp .env.example .env

# 3. Apply Prisma database schema
npx prisma db push

# 4. Start the Turbopack development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables Reference

See `.env.example` for the complete configuration template:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (`postgresql://user:pass@localhost:5532/dbname`) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID for Drive & Calendar sync |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | Optional | Redirect URI (`http://localhost:9999/api/google/callback` or port `9898`) |
| `GEMINI_API_KEY` | Optional | Google AI Gemini API key (supports Gemini 2.5) |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for Claude 3.7 / 3.5 Sonnet |
| `OPENAI_API_KEY` | Optional | OpenAI API key for GPT-4o, Whisper STT, and TTS |

---

## 🧪 Testing & Quality Assurance

```bash
# Run unit and integration tests
npm test

# Type checking
npm run type-check

# Run linter
npm run lint

# End-to-End tests
npm run test:e2e
```

---

## ⌨️ Useful Keyboard Shortcuts

- <kbd>Cmd</kbd> + <kbd>K</kbd> : Open Command Palette & Quick Search
- <kbd>Cmd</kbd> + <kbd>J</kbd> : Open Quick Notes
- <kbd>Esc</kbd> : Close active modal or drawer
- <kbd>Enter</kbd> : Confirm modal actions

---

## 🤝 Contributing

Contributions, feedback, and pull requests are warmly welcomed!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Developed with precision by <strong>DNZ Security & Software</strong> • Maintained by <a href="https://github.com/1kenz">@1kenz</a></sub>
</div>
