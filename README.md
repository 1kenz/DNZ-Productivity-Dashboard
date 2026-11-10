<div align="center">

  <a href="https://1kenz.github.io/DNZ-Productivity-Dashboard/">
    <img src="public/icons/icon-512.png" alt="DNZ Productivity Dashboard Logo" width="216" height="216" style="border-radius: 40px; box-shadow: 0 16px 40px rgba(0,0,0,0.4); margin-bottom: 20px;" />
  </a>

  # DNZ Productivity Dashboard
  ### The All-in-One, Local-First Productivity & Cognition Cockpit

  **All your Tasks, Projects, Kanban, Time Tracking, Pomodoro, Quick Notes, World Clocks, Multi-Account Calendars, and Voice-Driven AI Assistant in one cohesive workstation.**

  <br />

  [![Live Showcase](https://img.shields.io/badge/🌐_Live_Showcase_Site-1kenz.github.io-success?style=for-the-badge&logo=safari&logoColor=white)](https://1kenz.github.io/DNZ-Productivity-Dashboard/)
  [![Release](https://img.shields.io/badge/Release-v3.0.0-0070f3?style=for-the-badge&logo=github)](https://github.com/1kenz/DNZ-Productivity-Dashboard/releases)
  [![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

  [![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.2.3-20232a?style=flat-square&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
  [![Electron](https://img.shields.io/badge/Electron-33-47848f?style=flat-square&logo=electron)](https://www.electronjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker)](docker-compose.yml)

  <br />

  **[🌐 Live Showcase Site](https://1kenz.github.io/DNZ-Productivity-Dashboard/)** • **[⚡ Quickstart](#-quickstart)** • **[🧩 Core Modules](#-everything-you-need-in-one-workspace)** • **[🖥️ macOS Desktop App](#%EF%B8%8F-native-macos-desktop-app)** • **[🔒 Security & Privacy](#-security--zero-telemetry-guarantee)**

</div>

---

> ### 🌐 **Live Showcase & Interactive Product Tour**
> Experience the interactive live presentation, feature walk-throughs, and multi-language support in action:  
> 👉 **[https://1kenz.github.io/DNZ-Productivity-Dashboard/](https://1kenz.github.io/DNZ-Productivity-Dashboard/)**  
> *(Features built-in instant language switching: **English (Default)**, **Türkçe**, and **Deutsch**).*

---

## 🧩 Everything You Need in One Workspace

DNZ Productivity Dashboard eliminates tab fatigue by consolidating all essential personal productivity tools into a unified, high-performance interface:

| Module | Icon | Key Capabilities |
| :--- | :---: | :--- |
| **Tasks & Kanban** | 📋 | Drag-and-drop Kanban workflow, priority tags (Low/Med/High), deadline filters, subtasks, and file attachments. |
| **Projects & Sections** | 📁 | Multi-project organization (Security, Software, Home, Personal) with dedicated progress tracking. |
| **Pomodoro Hourglass** | ⏳ | Animated visual hourglass timer with custom focus intervals, short/long break loops, and audio notifications. |
| **Time Tracker** | ⏱️ | Real-time stopwatch and manual task duration logging with interactive **Recharts** productivity analytics. |
| **Quick Notes** | 📝 | Instant slide-over markdown scratchpad accessible system-wide with global hotkey <kbd>Cmd</kbd> + <kbd>J</kbd>. |
| **Quick Links & App Launcher** | 🔗 | Categorized bookmark clusters with auto-favicons + native launching of local macOS apps, files, and scripts. |
| **World Clocks** | ⏰ | Real-time international timezone monitors (Istanbul, London, New York, Tokyo, Berlin) for distributed workflows. |
| **Unified Calendar** | 📅 | Bi-directional calendar sync with **Google Calendar** (OAuth 2.0) and **Apple iCloud / CalDAV** (RFC 4791). |
| **Multimodal AI & Local LLM** | 🤖 | Hands-free **Live Voice**, live web citations, daily **SITREP** briefs, and **100% private Local LLMs via Ollama** (Llama 3.2, DeepSeek R1, Mistral, Qwen 2.5). |
| **Google Drive Cloud Sync** | ☁️ | Encrypted one-click database snapshot backups and instant cross-device state restoration. |

---

## 🖥️ Native macOS Desktop App

For macOS users (Sonoma, Sequoia, and Apple Silicon M-Series), DNZ Productivity Dashboard is packaged as a **standalone native desktop application (`.dmg`)**.

- **Embedded PostgreSQL 17**: Automatically starts its own isolated, native database engine on launch — **Zero Docker or background setup required**.
- **macOS Menu Bar (Tray) Icon**: Keeps quick actions, Pomodoro controls, and instant notes reachable even when the main window is closed.
- **Global Hotkeys**: System-wide <kbd>Cmd</kbd> + <kbd>K</kbd> Command Palette and <kbd>Cmd</kbd> + <kbd>J</kbd> Quick Notes trigger from anywhere on your Mac.
- **Native File Launcher**: Open local source files, scripts, and macOS applications directly from dashboard cards.

```bash
# Build standalone DMG installer from source:
bash scripts/build_desktop_app.sh
```

---

## 🚀 Quickstart

### Option 1: Docker Compose (Recommended for Web)

```bash
# 1. Clone repository
git clone https://github.com/1kenz/DNZ-Productivity-Dashboard.git
cd DNZ-Productivity-Dashboard

# 2. Configure environment
cp .env.example .env

# 3. Start database and dashboard
docker compose up -d
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### Option 2: Local Development (Node.js 18+)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Apply Prisma database schema
npx prisma db push

# 4. Start Turbopack dev server
npm run dev
```

---

## ⚙️ Environment Variables Reference

See `.env.example` for the complete configuration template:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (`postgresql://postgres:...@localhost:5532/...`) |
| `GOOGLE_CLIENT_ID` | Optional | Google Cloud OAuth 2.0 Client ID for Drive & Calendar sync |
| `GOOGLE_CLIENT_SECRET` | Optional | Google Cloud OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | Optional | OAuth redirect URI (`http://localhost:9999/api/google/callback` or port `9898`) |
| `GEMINI_API_KEY` | Optional | Google AI Studio Gemini API Key |
| `ANTHROPIC_API_KEY` | Optional | Anthropic Claude API Key |
| `OPENAI_API_KEY` | Optional | OpenAI API Key (Whisper STT / TTS / GPT-4o) |
| `OLLAMA_BASE_URL` | Optional | Ollama local server URL (defaults to `http://127.0.0.1:11434`, zero API key required) |

*All AI keys can also be securely configured at runtime directly from the in-app Settings panel.*

---

## 🔒 Security & Zero-Telemetry Guarantee

1. **Local-First Data Storage**: All tasks, calendar entries, and notes reside exclusively in your local PostgreSQL database.
2. **Zero Telemetry**: No tracking scripts, analytics cookies, third-party beacons, or background data collection.
3. **Local LLMs & BYO-Key Cloud Models**: Run 100% offline open-source models (Llama 3.2, Mistral, DeepSeek R1) via Ollama with zero data leaving your computer, or bring your own API keys for cloud providers. Keys are stored strictly locally and never exposed in frontend bundles.
4. **Sandboxed OAuth**: Google Drive and Calendar authorizations use strictly scoped, direct OAuth 2.0 tokens stored locally.

---

## ⌨️ Productivity Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Command Palette & Quick Search |
| <kbd>Cmd</kbd> + <kbd>J</kbd> | Open Quick Notes Popover |
| <kbd>Esc</kbd> | Dismiss active modal or overlay |
| <kbd>Enter</kbd> | Confirm dialog action / Submit modal |

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are warmly welcomed!

1. Fork the Project (`https://github.com/1kenz/DNZ-Productivity-Dashboard`)
2. Create your Feature Branch (`git checkout -b feature/NewCapability`)
3. Commit your Changes (`git commit -m 'feat: Add NewCapability'`)
4. Push to the Branch (`git push origin feature/NewCapability`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">
  <sub>Architected with precision by <strong>DNZ Security & Software</strong> • Maintained by <a href="https://github.com/1kenz">@1kenz</a></sub><br>
  <sub>🌐 <a href="https://1kenz.github.io/DNZ-Productivity-Dashboard/">https://1kenz.github.io/DNZ-Productivity-Dashboard/</a></sub>
</div>
