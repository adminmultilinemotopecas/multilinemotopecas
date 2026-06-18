import { prisma } from "@/lib/prisma";

export async function peekNextProductInternalCode(userId: string): Promise<string | null> {
  const profile = await prisma.admin_profiles.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!profile) return null;

  const rows = await prisma.$queryRaw<{ code: string }[]>`
    SELECT lpad(
      (
        GREATEST(
          COALESCE(
            (
              SELECT MAX(internal_code::bigint)
              FROM products
              WHERE internal_code ~ '^[0-9]{6}$'
            ),
            0
          ),
          (SELECT last_value FROM product_internal_code_seq)
        ) + 1
      )::text,
      6,
      '0'
    ) AS code
  `;

  return rows[0]?.code ?? null;
}
