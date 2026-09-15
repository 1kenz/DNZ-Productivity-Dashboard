-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "projectId" TEXT,
    "sectionId" TEXT,
    "parentTodoId" TEXT,
    "tags" TEXT[],
    "dueDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'todo',
    "recurringTaskId" TEXT,
    "targetCount" INTEGER,
    "currentCount" INTEGER,
    "unit" TEXT,
    "estimateHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
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

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clock" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Clock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LinkGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "groupId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "QuickLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewPreferences" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "taskView" TEXT NOT NULL DEFAULT 'list',
    "linkView" TEXT NOT NULL DEFAULT 'grid',
    "showCompleted" BOOLEAN NOT NULL DEFAULT true,
    "groupBy" TEXT NOT NULL DEFAULT 'none',

    CONSTRAINT "ViewPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "projectId" TEXT,
    "tags" TEXT[],
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleDriveAuth" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleDriveAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
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

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "anthropicApiKey" TEXT,
    "geminiApiKey" TEXT,
    "openaiApiKey" TEXT,
    "defaultProvider" TEXT NOT NULL DEFAULT 'gemini',
    "defaultModel" TEXT NOT NULL DEFAULT 'gemini-3.6-flash',
    "voiceLanguage" TEXT NOT NULL DEFAULT 'tr-TR',
    "autoSpeak" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_sectionId_idx" ON "Todo"("sectionId");

-- CreateIndex
CREATE INDEX "Todo_parentTodoId_idx" ON "Todo"("parentTodoId");

-- CreateIndex
CREATE UNIQUE INDEX "Todo_recurringTaskId_dueDate_key" ON "Todo"("recurringTaskId", "dueDate");

-- CreateIndex
CREATE INDEX "Section_projectId_idx" ON "Section"("projectId");

-- CreateIndex
CREATE INDEX "Section_parentId_idx" ON "Section"("parentId");

-- CreateIndex
CREATE INDEX "AiConversation_provider_idx" ON "AiConversation"("provider");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_idx" ON "AiMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_parentTodoId_fkey" FOREIGN KEY ("parentTodoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_recurringTaskId_fkey" FOREIGN KEY ("recurringTaskId") REFERENCES "RecurringTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickLink" ADD CONSTRAINT "QuickLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LinkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTask" ADD CONSTRAINT "RecurringTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

