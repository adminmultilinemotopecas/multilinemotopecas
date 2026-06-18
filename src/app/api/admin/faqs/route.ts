import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { prisma } from "@/lib/prisma";
import { mapFAQ } from "@/lib/db/mappers";

export async function GET() {
  return withAdminAuth(async () => {
    const records = await prisma.faqs.findMany({ orderBy: { sort_order: "asc" } });
    return NextResponse.json(records.map(mapFAQ));
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async () => {
    const body = await request.json();
    const question = String(body.question || "").trim();
    const answer = String(body.answer || "").trim();

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Pergunta e resposta são obrigatórias" },
        { status: 400 }
      );
    }

    const record = await prisma.faqs.create({
      data: {
        question,
        answer,
        sort_order: Number(body.sort_order) || 0,
        is_active: body.is_active ?? true,
      },
    });

    return NextResponse.json(mapFAQ(record), { status: 201 });
  });
}
