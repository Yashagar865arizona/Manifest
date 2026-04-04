-- Per-seat billing: add MONTHLY and ANNUAL to Plan enum
-- STARTER/GROWTH/SCALE are deprecated but retained to avoid a full enum recreation.

ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'MONTHLY';
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'ANNUAL';
