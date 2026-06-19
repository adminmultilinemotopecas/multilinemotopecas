import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import {
  getBatchSyncProgress,
  getCronConfig,
  startBatchPriceSync,
} from "@/lib/ml-price-sync/batch-runner";
import { listSyncCandidates } from "@/lib/ml-price-sync/price-sync-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return withAdminAuth(async () => {
    const progress = getBatchSyncProgress();
    const cron = getCronConfig();
    const eligibleCount = (await listSyncCandidates()).length;

    const timeZone = cron.timeZone;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const dailyRun = await prisma.price_sync_daily_runs.findUnique({
      where: { run_date: new Date(`${today}T00:00:00.000Z`) },
    });

    return NextResponse.json({
      progress,
      cron: {
        ...cron,
        ranToday: Boolean(dailyRun && dailyRun.status === "completed"),
        dailyRun: dailyRun
          ? {
              status: dailyRun.status,
              totalProducts: dailyRun.total_products,
              processed: dailyRun.processed,
              succeeded: dailyRun.succeeded,
              failed: dailyRun.failed,
              skipped: dailyRun.skipped,
              startedAt: dailyRun.started_at.toISOString(),
              completedAt: dailyRun.completed_at?.toISOString() ?? null,
            }
          : null,
      },
      eligibleCount,
    });
  });
}

export async function POST() {
  return withAdminAuth(async () => {
    const result = await startBatchPriceSync("manual");

    if (!result.started) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }

    return NextResponse.json({
      started: true,
      message: result.message,
      progress: getBatchSyncProgress(),
    });
  });
}
