import { createClient } from "@/lib/supabase/server";

export async function peekNextProductInternalCode(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("peek_next_product_internal_code");

  if (error || !data) return null;
  return data as string;
}
