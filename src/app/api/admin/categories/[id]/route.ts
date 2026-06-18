import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { prisma } from "@/lib/prisma";
import { mapCategory } from "@/lib/db/mappers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    const record = await prisma.categories.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }
    return NextResponse.json(mapCategory(record));
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    const body = await request.json();

    const record = await prisma.categories.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        description: body.description?.trim() || null,
        image_url: body.image_url?.trim() || null,
        parent_id: body.parent_id || null,
        sort_order: body.sort_order != null ? Number(body.sort_order) : undefined,
        is_active: body.is_active,
      },
    });

    return NextResponse.json(mapCategory(record));
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    await prisma.categories.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
