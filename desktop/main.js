const { app, BrowserWindow, shell, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execSync } = require('child_process');
const { Client } = require('pg');
// embedded-postgres is published as an ESM-only package ("type": "module"),
// so it can't be require()'d from this CommonJS file — load it lazily via
// dynamic import() instead (works fine from CJS, Node/Electron just don't
// allow the synchronous require() form for ESM targets).
let EmbeddedPostgres;
async function loadEmbeddedPostgres() {
  if (!EmbeddedPostgres) {
    ({ default: EmbeddedPostgres } = await import('embedded-postgres'));
  }
  return EmbeddedPostgres;
}

const isPackaged = app.isPackaged;
const resourcesPath = isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');

const APP_SERVER_DIR = path.join(resourcesPath, 'app-server');
const INIT_SQL_PATH = path.join(resourcesPath, 'prisma-schema', 'init.sql');
const ICON_PATH = path.join(resourcesPath, 'icon.png');

// Must match desktop/package.json's "productName" (electron-builder names
// its bundled Helper apps "<productName> Helper.app").
const PRODUCT_NAME = 'DNZ Productivity Dashboard';

// The app server is spawned in ELECTRON_RUN_AS_NODE mode, which turns
// Electron's binary into a plain Node interpreter — no window, no app
// menu. But spawning process.execPath (the MAIN app executable, at
// Contents/MacOS/<name>) still gets macOS to show a second Dock icon for
// it, because that executable's own Info.plist marks it as a regular
// foreground app (LSUIElement=false), regardless of what JS runs inside.
// Electron already ships a set of "Helper" apps for exactly this kind of
// background work (visible in Activity Monitor as "<name> Helper",
// "<name> Helper (Renderer)", "(GPU)", "(Plugin)") — the unsuffixed one is
// marked as a background agent in ITS Info.plist, so launching it instead
// runs identically but never gets a Dock icon. Falls back to
// process.execPath if that path doesn't exist (dev mode, or a future
// Electron packaging layout change), so this never breaks the app itself.
function getServerExecPath() {
  if (!isPackaged) return process.execPath;
  const helperPath = path.join(
    process.resourcesPath,
    '..',
    'Frameworks',
    `${PRODUCT_NAME} Helper.app`,
    'Contents',
    'MacOS',
    `${PRODUCT_NAME} Helper`
  );
  return fs.existsSync(helperPath) ? helperPath : process.execPath;
}

// Local-only, not published to the network — separate from the Docker
// deployment's ports (see DNZ-Core/docs/ecosystem/PORT-REGISTRY.md).
const PG_PORT = 5533;
const SERVER_PORT = 9898;
const DB_NAME = 'productivity_dashboard';
const DB_USER = 'postgres';
const DB_PASSWORD = 'postgrespassword';
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PG_PORT}/${DB_NAME}`;

const DATA_DIR = path.join(app.getPath('userData'), 'pgdata');

let embeddedPg;
let serverProcess;
let mainWindow;
let shuttingDown = false;

const LOG_PATH = path.join(app.getPath('userData'), 'desktop-app.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(String).join(' ')}`;
  console.log('[desktop]', ...args);
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch {
    // Logging is best-effort; never let it crash startup.
  }
}

// Optional: read GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI
// from a plain "desktop/.env" file next to this script, if the user wants
// Google Drive sync working inside the native app too. Not required.
// Each launch's embedded Postgres and app server bind to fixed local ports
// (see DNZ-Core/docs/ecosystem/PORT-REGISTRY.md). If a previous run's
// process was left behind (force-quit, crash, an older build's server that
// never exited) it can still be listening on that port — this app's own
// startup health-check (`tryConnect` in startNextServer) just checks "does
// anything answer on this port", so it would happily connect to that STALE
// process and show old/wrong content instead of failing loudly. Forcibly
// clear the ports before starting anything, so every launch is guaranteed
// to be talking to processes it just spawned itself.
function killProcessOnPort(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    if (!output) return;
    for (const pid of output.split('\n')) {
      if (!pid) continue;
      try {
        process.kill(Number(pid), 'SIGKILL');
        log(`Killed stale process ${pid} left listening on port ${port}`);
      } catch (err) {
        log(`Could not kill stale process ${pid} on port ${port}:`, err);
      }
    }
  } catch {
    // lsof exits non-zero when nothing is listening on the port — nothing to clean up.
  }
}

function loadDesktopEnv() {
  const envPath = path.join(__dirname, '.env');
  const result = {};
  if (!fs.existsSync(envPath)) return result;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

async function startPostgres() {
  const isFresh = !fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
  const EmbeddedPostgres = await loadEmbeddedPostgres();

  embeddedPg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    port: PG_PORT,
    persistent: true,
  });

  if (isFresh) {
    log('First launch — initializing local database...');
    await embeddedPg.initialise();
  }

  log('Starting local database...');
  await embeddedPg.start();

  if (isFresh) {
    log(`Creating database "${DB_NAME}"...`);
    await embeddedPg.createDatabase(DB_NAME);
  }
}

// Creates the schema on a fresh database using a plain SQL script generated
// at build time (see scripts/build_desktop_app.sh:
// `prisma migrate diff --from-empty --to-schema-datamodel=... --script`).
// Deliberately NOT using the Prisma CLI's own "db push" here — it pulls in
// a local dev-server layer (@prisma/dev) meant for live development that
// doesn't behave well bundled/offline. A plain "pg" connection is simple,
// well-understood, and has no such moving parts.
async function syncDatabaseSchema() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`SELECT to_regclass('public."Todo"') AS exists`);
    if (rows[0] && rows[0].exists) {
      log('Database schema already present, skipping init.');
      return;
    }
    if (!fs.existsSync(INIT_SQL_PATH)) {
      throw new Error(`init.sql not found at ${INIT_SQL_PATH}`);
    }
    log('Creating database schema (first launch)...');
    const sql = fs.readFileSync(INIT_SQL_PATH, 'utf8');
    await client.query(sql);
    log('Database schema created.');
  } finally {
    await client.end();
  }
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(APP_SERVER_DIR, 'server.js');
    if (!fs.existsSync(serverPath)) {
      reject(new Error(`App server not found at ${serverPath}`));
      return;
    }

    const desktopEnv = loadDesktopEnv();
    log('Starting app server...');
    let serverOutput = '';
    let serverExited = false;
    serverProcess = spawn(getServerExecPath(), [serverPath], {
      cwd: APP_SERVER_DIR,
      env: {
        ...process.env,
        ...desktopEnv,
        GOOGLE_REDIRECT_URI: desktopEnv.GOOGLE_REDIRECT_URI || `http://127.0.0.1:${SERVER_PORT}/api/google/callback`,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(SERVER_PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        DATABASE_URL,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serverProcess.stdout.on('data', (d) => { serverOutput += d.toString(); log('[server]', d.toString().trim()); });
    serverProcess.stderr.on('data', (d) => { serverOutput += d.toString(); log('[server]', d.toString().trim()); });
    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      serverExited = true;
      if (code !== null && code !== 0 && !shuttingDown) {
        log('App server exited unexpectedly with code', code);
        reject(new Error(`App server exited with code ${code}:\n${serverOutput}`));
      }
    });

    const deadline = Date.now() + 30000;
    const tryConnect = () => {
      if (serverExited) return; // already rejected above
      const req = http.get(`http://127.0.0.1:${SERVER_PORT}`, () => resolve());
      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`App server did not respond within 30s. Output so far:\n${serverOutput}`));
          return;
        }
        setTimeout(tryConnect, 300);
      });
    };
    setTimeout(tryConnect, 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'DNZ Productivity Dashboard',
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: {
      contextIsolation: true,
    },
  });
  session.defaultSession.clearCache().finally(() => {
    mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
  });

  // Google Drive's OAuth consent screen etc. should open in the user's real
  // browser, not inside this app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${SERVER_PORT}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    killProcessOnPort(PG_PORT);
    killProcessOnPort(SERVER_PORT);
    await startPostgres();
    await syncDatabaseSchema();
    await startNextServer();
    createWindow();
  } catch (err) {
    console.error('[desktop] Startup failed:', err);
    dialog.showErrorBox(
      'DNZ Productivity Dashboard failed to start',
      String((err && err.stack) || err) + `\n\nFull log: ${LOG_PATH}`
    );
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', async (e) => {
  if (shuttingDown) return;
  shuttingDown = true;
  e.preventDefault();
  log('Shutting down...');
  try {
    if (serverProcess) serverProcess.kill();
  } catch (err) {
    log('Error stopping app server:', err);
  }
  try {
    if (embeddedPg) await embeddedPg.stop();
  } catch (err) {
    log('Error stopping local database:', err);
  }
  app.exit(0);
});
