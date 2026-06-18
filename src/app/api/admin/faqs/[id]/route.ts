import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { prisma } from "@/lib/prisma";
import { mapFAQ } from "@/lib/db/mappers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    const record = await prisma.faqs.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "FAQ não encontrada" }, { status: 404 });
    }
    return NextResponse.json(mapFAQ(record));
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    const body = await request.json();

    const record = await prisma.faqs.update({
      where: { id },
      data: {
        question: body.question?.trim(),
        answer: body.answer?.trim(),
        sort_order: body.sort_order != null ? Number(body.sort_order) : undefined,
        is_active: body.is_active,
      },
    });

    return NextResponse.json(mapFAQ(record));
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    await prisma.faqs.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
