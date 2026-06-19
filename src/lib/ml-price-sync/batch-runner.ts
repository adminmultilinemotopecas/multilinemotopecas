import { prisma } from "@/lib/prisma";
import {
  getSyncDelayMs,
  listSyncCandidates,
  sleep,
  syncProductPrice,
} from "@/lib/ml-price-sync/price-sync-service";
import type { BatchSyncProgress } from "@/lib/ml-price-sync/types";

let progress: BatchSyncProgress = createIdleProgress();

function createIdleProgress(): BatchSyncProgress {
  return {
    running: false,
    triggerSource: null,
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    currentProductId: null,
    currentProductName: null,
    startedAt: null,
    finishedAt: null,
    lastError: null,
  };
}

export function getBatchSyncProgress(): BatchSyncProgress {
  return { ...progress };
}

export function isBatchSyncRunning(): boolean {
  return progress.running;
}

export async function startBatchPriceSync(
  triggerSource: "manual" | "cron"
): Promise<{ started: boolean; message: string }> {
  if (progress.running) {
    return {
      started: false,
      message: "Já existe uma sincronização em andamento.",
    };
  }

  const candidates = await listSyncCandidates();

  progress = {
    running: true,
    triggerSource,
    total: candidates.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    currentProductId: null,
    currentProductName: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastError: null,
  };

  void runBatchLoop(candidates.map((item) => ({ id: item.id, name: item.name })), triggerSource);

  return {
    started: true,
    message:
      candidates.length > 0
        ? `Sincronização iniciada para ${candidates.length} produto(s).`
        : "Nenhum produto elegível para sincronização.",
  };
}

async function runBatchLoop(
  candidates: Array<{ id: string; name: string }>,
  triggerSource: "manual" | "cron"
) {
  try {
    for (const candidate of candidates) {
      progress.currentProductId = candidate.id;
      progress.currentProductName = candidate.name;

      try {
        const result = await syncProductPrice({
          productId: candidate.id,
          triggerSource,
        });

        if (result.scrape.status === "skipped" || result.scrape.status === "no_url") {
          progress.skipped += 1;
        } else if (result.scrape.status === "success") {
          progress.succeeded += 1;
        } else if (result.scrape.status === "low_confidence") {
          progress.skipped += 1;
        } else {
          progress.failed += 1;
          progress.lastError = result.message;
        }
      } catch (error) {
        progress.failed += 1;
        progress.lastError =
          error instanceof Error ? error.message : "Erro ao sincronizar produto";
      }

      progress.processed += 1;
      await sleep(getSyncDelayMs());
    }
  } finally {
    progress.running = false;
    progress.currentProductId = null;
    progress.currentProductName = null;
    progress.finishedAt = new Date().toISOString();
  }
}

function getTimeZoneDateString(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function runDailyPriceSyncIfDue(): Promise<{
  started: boolean;
  message: string;
}> {
  const enabled = process.env.PRICE_SYNC_CRON_ENABLED === "true";
  if (!enabled) {
    return { started: false, message: "Cron de preços desabilitado." };
  }

  const timeZone = process.env.PRICE_SYNC_TIMEZONE || "America/Sao_Paulo";
  const runDate = getTimeZoneDateString(timeZone);

  const existing = await prisma.price_sync_daily_runs.findUnique({
    where: { run_date: new Date(`${runDate}T00:00:00.000Z`) },
  });

  if (existing) {
    if (existing.status === "completed") {
      return { started: false, message: "Sincronização diária já executada hoje." };
    }

    if (existing.status === "running" && isBatchSyncRunning()) {
      return { started: false, message: "Sincronização em andamento." };
    }
  } else if (isBatchSyncRunning()) {
    return { started: false, message: "Sincronização em andamento." };
  }

  const candidates = await listSyncCandidates();
  const runDateValue = new Date(`${runDate}T00:00:00.000Z`);

  if (!existing) {
    await prisma.price_sync_daily_runs.create({
      data: {
        run_date: runDateValue,
        status: "running",
        total_products: candidates.length,
      },
    });
  } else {
    await prisma.price_sync_daily_runs.update({
      where: { run_date: runDateValue },
      data: {
        status: "running",
        total_products: candidates.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        completed_at: null,
      },
    });
  }

  const startResult = await startBatchPriceSync("cron");

  if (startResult.started) {
    void monitorDailyRunCompletion(runDate, candidates.length);
  }

  return startResult;
}

async function monitorDailyRunCompletion(runDate: string, total: number) {
  while (isBatchSyncRunning()) {
    await sleep(2000);
  }

  const finalProgress = getBatchSyncProgress();

  await prisma.price_sync_daily_runs.update({
    where: { run_date: new Date(`${runDate}T00:00:00.000Z`) },
    data: {
      status: "completed",
      completed_at: new Date(),
      total_products: total,
      processed: finalProgress.processed,
      succeeded: finalProgress.succeeded,
      failed: finalProgress.failed,
      skipped: finalProgress.skipped,
    },
  });
}

export function getCronConfig() {
  return {
    enabled: process.env.PRICE_SYNC_CRON_ENABLED === "true",
    time: process.env.PRICE_SYNC_TIME || "05:00",
    timeZone: process.env.PRICE_SYNC_TIMEZONE || "America/Sao_Paulo",
    delayMs: getSyncDelayMs(),
  };
}
