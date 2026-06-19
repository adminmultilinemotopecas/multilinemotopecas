import cron from "node-cron";
import { getCronConfig, runDailyPriceSyncIfDue } from "@/lib/ml-price-sync/batch-runner";

let cronStarted = false;

function parseCronExpression(time: string): string {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number.parseInt(hourRaw ?? "5", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "0 5 * * *";
  }

  return `${minute} ${hour} * * *`;
}

export function startPriceSyncCron() {
  if (cronStarted) return;

  const config = getCronConfig();
  if (!config.enabled) {
    console.info("[price-sync-cron] Desabilitado (PRICE_SYNC_CRON_ENABLED != true)");
    return;
  }

  const expression = parseCronExpression(config.time);

  cron.schedule(
    expression,
    async () => {
      try {
        const result = await runDailyPriceSyncIfDue();
        console.info("[price-sync-cron]", result.message);
      } catch (error) {
        console.error(
          "[price-sync-cron] Erro:",
          error instanceof Error ? error.message : error
        );
      }
    },
    { timezone: config.timeZone }
  );

  cronStarted = true;
  console.info(
    `[price-sync-cron] Agendado para ${config.time} (${config.timeZone}) — expressão: ${expression}`
  );
}
