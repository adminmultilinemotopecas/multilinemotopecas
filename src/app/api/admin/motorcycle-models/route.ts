import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { prisma } from "@/lib/prisma";
import { mapMotorcycleModel } from "@/lib/db/mappers";
import { slugify } from "@/lib/utils";

export async function GET() {
  return withAdminAuth(async () => {
    const records = await prisma.motorcycle_models.findMany({
      orderBy: { motorcycle_brand: "asc" },
    });
    return NextResponse.json(records.map(mapMotorcycleModel));
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async () => {
    const body = await request.json();
    const motorcycleBrand = String(body.motorcycle_brand || "").trim();
    const model = String(body.model || "").trim();

    if (!motorcycleBrand || !model) {
      return NextResponse.json(
        { error: "Marca e modelo são obrigatórios" },
        { status: 400 }
      );
    }

    const record = await prisma.motorcycle_models.create({
      data: {
        motorcycle_brand: motorcycleBrand,
        model,
        slug: slugify(`${motorcycleBrand}-${model}`),
        displacement: body.displacement?.trim() || null,
        year_start: body.year_start ? Number(body.year_start) : null,
        year_end: body.year_end ? Number(body.year_end) : null,
        is_active: body.is_active ?? true,
      },
    });

    return NextResponse.json(mapMotorcycleModel(record), { status: 201 });
  });
}
