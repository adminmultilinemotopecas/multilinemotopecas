export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPriceSyncCron } = await import("@/lib/ml-price-sync/cron");
    startPriceSyncCron();
  }
}
