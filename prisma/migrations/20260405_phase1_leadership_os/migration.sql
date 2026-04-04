-- Phase 1: AI Leadership OS
-- Adds LeadershipRole, connector credentials, raw signals, baselines,
-- anomaly alerts, daily briefs, and org chart nodes.
-- Also adds slug + headcountRange to workspaces, leadershipRole to workspace_members.

-- CreateEnum
CREATE TYPE "LeadershipRole" AS ENUM ('CEO', 'MANAGER', 'HR', 'IC');

-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('SLACK', 'GITHUB', 'GOOGLE_CALENDAR');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM (
    'MESSAGE_COUNT',
    'CHANNEL_ACTIVITY_COUNT',
    'DM_SENT_COUNT',
    'DM_RESPONSE_LATENCY_MIN',
    'REACTION_COUNT',
    'COMMITS_COUNT',
    'PRS_MERGED_COUNT',
    'PRS_OPENED_COUNT',
    'PR_REVIEW_COUNT',
    'ISSUES_CLOSED_COUNT',
    'ISSUES_OPENED_COUNT',
    'MEETING_HOURS',
    'FOCUS_TIME_HOURS',
    'CALENDAR_EVENTS_COUNT',
    'ONEONONE_COUNT'
);

-- CreateEnum
CREATE TYPE "SignalSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM (
    'GHOST_DETECTION',
    'OVERLOAD',
    'ATTRITION_RISK',
    'MEETING_DEBT',
    'STALLED_WORK'
);

-- AlterTable workspaces: add slug and headcountRange
ALTER TABLE "workspaces" ADD COLUMN "slug" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "headcountRange" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- AlterTable workspace_members: add leadershipRole
ALTER TABLE "workspace_members" ADD COLUMN "leadershipRole" "LeadershipRole" NOT NULL DEFAULT 'IC';

-- CreateTable connector_credentials
CREATE TABLE "connector_credentials" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectorType" "ConnectorType" NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "teamId" TEXT,
    "teamName" TEXT,
    "scopes" TEXT,
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "connector_credentials_workspaceId_connectorType_key" ON "connector_credentials"("workspaceId", "connectorType");

-- CreateTable raw_signals
CREATE TABLE "raw_signals" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectorType" "ConnectorType" NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "signalDate" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_signals_workspaceId_userId_signalType_signalDate_key" ON "raw_signals"("workspaceId", "userId", "signalType", "signalDate");

-- CreateIndex
CREATE INDEX "raw_signals_workspaceId_signalDate_idx" ON "raw_signals"("workspaceId", "signalDate");

-- CreateIndex
CREATE INDEX "raw_signals_workspaceId_userId_idx" ON "raw_signals"("workspaceId", "userId");

-- CreateTable user_baselines
CREATE TABLE "user_baselines" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "stdDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "windowDays" INTEGER NOT NULL DEFAULT 30,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_baselines_workspaceId_userId_signalType_key" ON "user_baselines"("workspaceId", "userId", "signalType");

-- CreateTable anomaly_alerts
CREATE TABLE "anomaly_alerts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anomalyType" "AnomalyType" NOT NULL,
    "severity" "SignalSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "signalType" "SignalType",
    "currentValue" DOUBLE PRECISION,
    "baselineValue" DOUBLE PRECISION,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "anomaly_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anomaly_alerts_workspaceId_detectedAt_idx" ON "anomaly_alerts"("workspaceId", "detectedAt");

-- CreateIndex
CREATE INDEX "anomaly_alerts_workspaceId_userId_idx" ON "anomaly_alerts"("workspaceId", "userId");

-- CreateTable daily_briefs
CREATE TABLE "daily_briefs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LeadershipRole" NOT NULL,
    "briefDate" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_briefs_workspaceId_userId_briefDate_key" ON "daily_briefs"("workspaceId", "userId", "briefDate");

-- CreateTable org_nodes
CREATE TABLE "org_nodes" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managerId" TEXT,
    "department" TEXT,
    "title" TEXT,
    "leadershipRole" "LeadershipRole" NOT NULL DEFAULT 'IC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_nodes_workspaceId_userId_key" ON "org_nodes"("workspaceId", "userId");

-- AddForeignKey
ALTER TABLE "connector_credentials" ADD CONSTRAINT "connector_credentials_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_signals" ADD CONSTRAINT "raw_signals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_signals" ADD CONSTRAINT "raw_signals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_baselines" ADD CONSTRAINT "user_baselines_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_baselines" ADD CONSTRAINT "user_baselines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_briefs" ADD CONSTRAINT "daily_briefs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_briefs" ADD CONSTRAINT "daily_briefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
