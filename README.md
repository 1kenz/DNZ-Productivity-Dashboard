# DNZ Productivity Dashboard

A modern, enterprise-grade productivity dashboard for managing daily tasks, organizing quick links, and tracking productivity.

![Dashboard Screenshot](/Users/ikenz/.gemini/antigravity/brain/ed431fcf-b320-463c-85c1-5a930627054b/initial_dashboard_view_1769523323460.png)

## ✨ Features

### 📋 Task Management
- Create, edit, and delete tasks
- Priority levels (Low, Medium, High) with color coding
- Filter tasks (All, Active, Completed)
- Sort by date, priority, or alphabetically
- Inline editing with double-click
- Task completion tracking

### 🔗 Quick Links
- Organize links into custom groups
- Choose from 8 preset colors and icons
- Automatic favicon fetching
- Expandable/collapsible groups
- Easy link management

### 🎨 UI/UX
- Dark/Light theme toggle
- Responsive design (mobile, tablet, desktop)
- Smooth animations and transitions
- Professional Inter font
- Accessibility features (ARIA, keyboard navigation)

### 💾 Data Persistence
- Automatic local storage
- Data survives page refresh
- No backend required

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone or navigate to the project
cd productivity-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🖥️ macOS Desktop App

This project can also be built into a standalone native macOS app (`.dmg`) that
bundles its own PostgreSQL database — no Docker Desktop needed to run it day to
day. It's a separate local database from the Docker deployment; use
Settings → Backup/Import (or Google Drive sync) to move data between the two.

```bash
bash scripts/build_desktop_app.sh
```

This installs dependencies, builds the Next.js app, and packages everything
with Electron into `desktop/dist/*.dmg`. Requires real internet access (npm
registry, Prisma's engine CDN, Electron's binary downloads) — run it in a
normal Terminal, not inside a sandboxed shell. See `desktop/main.js` for how
it wires the embedded database to the bundled app server.

## ☁️ Google Drive Sync Setup

Settings → Google Drive Sync lets you connect a Google account and back up
(or restore) your data straight to Drive, from either the Docker deployment
or the native macOS app. It needs its own OAuth credentials — one-time setup
in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create
   or pick a project, then enable the **Google Drive API**
   (APIs & Services → Library).
2. Configure the **OAuth consent screen** (APIs & Services → OAuth consent
   screen). "External" + "Testing" is fine for personal use — add your own
   Google account as a test user.
3. Create credentials (APIs & Services → Credentials → Create Credentials →
   OAuth client ID), application type **Web application**. Under
   "Authorized redirect URIs" add both, so the same client works for both
   deployments:
   - `http://localhost:9999/api/google/callback` (Docker deployment, port 9999)
   - `http://127.0.0.1:9898/api/google/callback` (native macOS app, port 9898)
4. Copy the generated **Client ID** and **Client secret**.
5. Add them to the `.env` the running instance actually reads:
   - Docker/dev deployment → root `.env` (`GOOGLE_CLIENT_ID`,
     `GOOGLE_CLIENT_SECRET`; `GOOGLE_REDIRECT_URI` optional, defaults to the
     first URI above if unset).
   - Native macOS app → create `desktop/.env` (see
     `desktop/.env.example`) with the same two values, then rebuild
     (`bash scripts/build_desktop_app.sh`) so it's bundled into the app.

Once set, Settings → Google Drive Sync shows a "Connect Google Drive" button
instead of "Not set up yet".

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS with CSS Modules
- **State Management**: React Context API
- **Storage**: Browser Local Storage
- **Testing**: Jest + React Testing Library + Playwright

## 📁 Project Structure

```
productivity-dashboard/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main dashboard page
│   └── page.module.css    # Page styles
├── components/            # React components
│   ├── Dashboard/         # Header and layout
│   ├── TodoList/          # Task management
│   ├── QuickLinks/        # Link organization
│   └── ui/                # Reusable UI components
├── contexts/              # React contexts
│   └── AppContext.tsx     # Global state
├── hooks/                 # Custom hooks
│   └── useLocalStorage.ts # Persistent storage
├── styles/                # Global styles
│   ├── design-system.css  # CSS variables
│   └── globals.css        # Base styles
├── types/                 # TypeScript types
│   └── index.ts           # Type definitions
└── tests/                 # Test files
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

## 📝 Usage

### Adding Tasks
1. Click "+ Add Task" button
2. Enter task title (required)
3. Add description (optional)
4. Select priority level
5. Click "Add Task"

### Managing Link Groups
1. Click "+ Add Group" button
2. Enter group name
3. Choose a color and icon
4. Add links (title + URL)
5. Click "Create Group"

### Theme Toggle
Click the sun/moon icon in the header to switch between light and dark themes.

## 🎯 Roadmap

- [ ] Pomodoro Timer
- [ ] Quick Notes
- [ ] Time Tracker
- [ ] Analytics Dashboard
- [ ] Drag-and-drop task reordering
- [ ] Due dates and reminders
- [ ] Export/Import data
- [ ] Cloud sync (optional)

## 🤝 Contributing

This is a personal productivity tool, but feel free to fork and customize for your needs!

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Icons from emoji set
- Fonts from [Google Fonts](https://fonts.google.com/)

---

**Built with ❤️ for productivity enthusiasts**
