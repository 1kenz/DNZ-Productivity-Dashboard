-- Idempotent incremental schema changes, safe to run on EVERY desktop app
-- launch (both fresh installs and upgrades of an existing install). This
-- file is deliberately separate from init.sql (which only ever runs once,
-- on a brand-new database): init.sql already contains all of this for a
-- fresh install, so every statement below becomes a harmless no-op there.
--
-- Whenever prisma/schema.prisma changes in a backward-compatible (additive)
-- way, add the matching idempotent statement(s) here so existing desktop
-- installs pick up the change on next launch. Never put a DROP or RENAME
-- here -- those need a real migration story (and a backup prompt) first.

-- --- Section table (Proje > Ana Bolum > Alt Bolum hierarchy) ---
CREATE TABLE IF NOT EXISTS "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Section_projectId_idx" ON "Section"("projectId");
CREATE INDEX IF NOT EXISTS "Section_parentId_idx" ON "Section"("parentId");

DO $$ BEGIN
  ALTER TABLE "Section" ADD CONSTRAINT "Section_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Section" ADD CONSTRAINT "Section_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --- Todo: section/subtask links + numeric-goal fields ---
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "sectionId" TEXT;
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "parentTodoId" TEXT;
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "targetCount" INTEGER;
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "currentCount" INTEGER;
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "estimateHours" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "Todo_sectionId_idx" ON "Todo"("sectionId");
CREATE INDEX IF NOT EXISTS "Todo_parentTodoId_idx" ON "Todo"("parentTodoId");

DO $$ BEGIN
  ALTER TABLE "Todo" ADD CONSTRAINT "Todo_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Todo" ADD CONSTRAINT "Todo_parentTodoId_fkey"
    FOREIGN KEY ("parentTodoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --- Attachment table: local files/programs linked to a Todo or a Note ---
CREATE TABLE IF NOT EXISTS "Attachment" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "todoId" TEXT,
    "noteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Attachment_todoId_idx" ON "Attachment"("todoId");
CREATE INDEX IF NOT EXISTS "Attachment_noteId_idx" ON "Attachment"("noteId");

DO $$ BEGIN
  ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_todoId_fkey"
    FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --- AppleCalendarAccount / CalendarPreference: schema.prisma has had
-- these since the Calendar Sync feature (commit 4f8cac1), but they were
-- never added here -- an existing desktop-app database never got them,
-- so any calendar query would fail with "relation does not exist". Added
-- now (idempotent, matches the init.sql baseline) alongside the new
-- LocalCalendarEvent table below.
CREATE TABLE IF NOT EXISTS "AppleCalendarAccount" (
    "id" TEXT NOT NULL,
    "appleId" TEXT NOT NULL,
    "appPassword" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppleCalendarAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CalendarPreference" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#4285F4',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "writable" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarPreference_pkey" PRIMARY KEY ("id")
);

-- (No intermediate 2-column unique index here -- see the comment by the
-- final 3-column CalendarPreference index below for why.)

-- --- LocalCalendarEvent: the built-in "My Calendar" fallback, always
-- available even when no Google/Apple account is connected ---
CREATE TABLE IF NOT EXISTS "LocalCalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LocalCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LocalCalendarEvent_start_idx" ON "LocalCalendarEvent"("start");

-- --- Multi-account calendar support: GoogleDriveAuth and
-- AppleCalendarAccount used to be fixed-id singleton rows (id = 'default'),
-- so only one Google account and one Apple/iCloud account could ever be
-- connected. Both tables already used a plain TEXT primary key with no
-- single-row constraint at the DB level, so no ALTER is needed there --
-- app code just needed to stop always writing to id = 'default' and start
-- creating a new row per account instead (see app/actions/calendar.ts and
-- app/api/google/callback/route.ts). GoogleDriveAuth does need a createdAt
-- column added, though, so Drive backups (which don't ask for a specific
-- account) can keep using "the oldest connected account" as an unambiguous
-- default the same way it behaved back when there could only ever be one.
ALTER TABLE "GoogleDriveAuth" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CalendarPreference.accountId: disambiguates calendars across MULTIPLE
-- connected accounts of the same provider -- e.g. every Google account's
-- default calendar has the literal id "primary", so the old
-- (provider, calendarId) unique index would collide the moment a second
-- Google account was connected. NULL for the always-on local calendar and
-- for any pre-existing single-account rows (Postgres treats NULLs as
-- distinct from each other for uniqueness purposes, so that's safe).
ALTER TABLE "CalendarPreference" ADD COLUMN IF NOT EXISTS "accountId" TEXT;

DROP INDEX IF EXISTS "CalendarPreference_provider_calendarId_key";

-- Remove true duplicate rows (same provider + accountId + calendarId,
-- NULLs included since Postgres DISTINCT ON treats NULL = NULL here)
-- before the unique index below can be created. Safe/idempotent: it only
-- ever removes exact re-syncs of the same account's same calendar, never
-- two different accounts' calendars that happen to share a provider's
-- generic id like "primary" -- those differ by accountId and are kept.
DELETE FROM "CalendarPreference"
WHERE "ctid" NOT IN (
  SELECT DISTINCT ON ("provider", "accountId", "calendarId") "ctid"
  FROM "CalendarPreference"
  ORDER BY "provider", "accountId", "calendarId", "updatedAt" DESC, "id"
);

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarPreference_provider_accountId_calendarId_key" ON "CalendarPreference"("provider", "accountId", "calendarId");

-- --- ViewPreferences.lastDueDateModalShownAt: added so the Due Dates
-- modal only auto-opens once per calendar day on launch instead of every
-- reload (see lib/dueDates.ts). Existing installs never got this column,
-- so every read/write against ViewPreferences (which also carries
-- taskView/linkView/groupBy/calendarView) was failing outright with
-- "column does not exist" until this runs.
ALTER TABLE "ViewPreferences" ADD COLUMN IF NOT EXISTS "lastDueDateModalShownAt" TIMESTAMP(3);

-- --- AI Chat feature: AiConversation, AiMessage, AiSettings ---
-- These three tables back the whole AI Chat / Live Voice feature
-- (components/AiChat/*, app/actions/ai.ts, app/api/ai/*). They were added
-- to schema.prisma well after this desktop app's incremental-migration
-- story existed, and never got added here -- so on every existing
-- install, AiSettings/AiConversation/AiMessage simply didn't exist at
-- all. That silently broke several things at once: reading/saving the AI
-- provider API keys (Settings > API Key Settings), every "new chat"
-- conversation (which fell back to a client-only, never-persisted
-- conversation -- see the fallback path in components/AiChat/AiChatView.tsx),
-- and Live Voice's server-side transcription route (app/api/ai/stt/route.ts)
-- silently losing access to a saved OpenAI key, which could produce a
-- 'no-api-key' error even for a user who had entered one in Settings.
CREATE TABLE IF NOT EXISTS "AiConversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiConversation_provider_idx" ON "AiConversation"("provider");

CREATE TABLE IF NOT EXISTS "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiMessage_conversationId_idx" ON "AiMessage"("conversationId");

DO $$ BEGIN
  ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "anthropicApiKey" TEXT,
    "geminiApiKey" TEXT,
    "openaiApiKey" TEXT,
    "defaultProvider" TEXT NOT NULL DEFAULT 'gemini',
    "defaultModel" TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    "voiceLanguage" TEXT NOT NULL DEFAULT 'tr-TR',
    "autoSpeak" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);
