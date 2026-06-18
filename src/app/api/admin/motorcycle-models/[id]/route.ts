import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { prisma } from "@/lib/prisma";
import { mapMotorcycleModel } from "@/lib/db/mappers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    const record = await prisma.motorcycle_models.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
    }
    return NextResponse.json(mapMotorcycleModel(record));
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    const body = await request.json();

    const record = await prisma.motorcycle_models.update({
      where: { id },
      data: {
        motorcycle_brand: body.motorcycle_brand?.trim(),
        model: body.model?.trim(),
        displacement: body.displacement?.trim() || null,
        year_start: body.year_start ? Number(body.year_start) : null,
        year_end: body.year_end ? Number(body.year_end) : null,
        is_active: body.is_active,
      },
    });

    return NextResponse.json(mapMotorcycleModel(record));
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    await prisma.motorcycle_models.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
