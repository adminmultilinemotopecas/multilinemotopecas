import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: "Não autenticado" as const };
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { user: null, error: "Erro ao verificar permissões" as const };
  }

  if (!adminProfile) {
    return { user: null, error: "Sem permissão de administrador" as const };
  }

  return { user, error: null };
}
