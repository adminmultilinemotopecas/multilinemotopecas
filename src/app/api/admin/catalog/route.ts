import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { mapProduct } from "@/lib/db/mappers";
import { listCatalogProducts } from "@/lib/db/products-admin";

export async function GET() {
  return withAdminAuth(async () => {
    const records = await listCatalogProducts();
    return NextResponse.json(records.map(mapProduct));
  });
}
