import type { SupabaseClient } from "@supabase/supabase-js";
import type { MlVerificationResult } from "@/lib/mercado-livre-verify";
import {
  shouldDeactivateProductOnVerification,
  shouldReactivateProductOnVerification,
} from "@/lib/mercado-livre-verify";

export async function applyVerificationToProduct(
  supabase: SupabaseClient,
  productId: string,
  result: MlVerificationResult
) {
  const updates: Record<string, unknown> = {
    ml_verified_at: result.checkedAt,
    ml_verification_message: result.message,
  };

  let productDeactivated = false;
  let productReactivated = false;

  if (shouldDeactivateProductOnVerification(result.status)) {
    updates.status = "inactive";
    updates.ml_verification_pending = true;
    productDeactivated = true;
  } else if (shouldReactivateProductOnVerification(result.status)) {
    updates.status = "active";
    updates.ml_verification_pending = false;
    productReactivated = true;
  }

  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId);

  if (error) {
    throw error;
  }

  return { productDeactivated, productReactivated };
}
