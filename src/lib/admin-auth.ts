import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: "Não autenticado" as const };
  }

  try {
    const adminProfile = await prisma.admin_profiles.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!adminProfile) {
      return { user: null, error: "Sem permissão de administrador" as const };
    }

    return { user, error: null };
  } catch {
    return { user: null, error: "Erro ao verificar permissões" as const };
  }
}
