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
