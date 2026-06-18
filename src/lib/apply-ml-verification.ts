import { prisma } from "@/lib/prisma";
import type { MlVerificationResult } from "@/lib/mercado-livre-verify";

export async function applyVerificationToProductDb(
  productId: string,
  result: MlVerificationResult
) {
  const updates: Record<string, unknown> = {
    ml_verified_at: new Date(result.checkedAt),
    ml_verification_message: result.message,
  };

  let productDeactivated = false;
  let productReactivated = false;

  if (result.status === "not_found" || result.status === "invalid_url" || result.status === "inactive") {
    updates.status = "inactive";
    updates.ml_verification_pending = true;
    productDeactivated = true;
  } else if (result.status === "active") {
    updates.status = "active";
    updates.ml_verification_pending = false;
    productReactivated = true;
  }

  await prisma.products.update({
    where: { id: productId },
    data: updates as {
      ml_verified_at: Date;
      ml_verification_message: string;
      status?: "active" | "inactive";
      ml_verification_pending?: boolean;
    },
  });

  return { productDeactivated, productReactivated };
}
