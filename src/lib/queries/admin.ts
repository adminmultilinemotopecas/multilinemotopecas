import { peekNextProductInternalCode } from "@/lib/db/admin-codes";

export async function peekNextProductInternalCodeForAdmin(
  userId: string
): Promise<string | null> {
  return peekNextProductInternalCode(userId);
}
