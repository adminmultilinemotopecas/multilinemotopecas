import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { prisma } from "@/lib/prisma";
import { mapBrand } from "@/lib/db/mappers";
import { slugify } from "@/lib/utils";

export async function GET() {
  return withAdminAuth(async () => {
    const records = await prisma.brands.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(records.map(mapBrand));
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async () => {
    const body = await request.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const record = await prisma.brands.create({
      data: {
        name,
        slug: slugify(name),
        description: body.description?.trim() || null,
        logo_url: body.logo_url?.trim() || null,
        sort_order: Number(body.sort_order) || 0,
        is_active: body.is_active ?? true,
      },
    });

    return NextResponse.json(mapBrand(record), { status: 201 });
  });
}
