import { NextResponse } from "next/server";
import { getProduct, updateProduct, deleteProduct } from "@/lib/products";
import type { ProductInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const product = getProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to get product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const existing = getProduct(id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = (await req.json()) as Partial<ProductInput>;
    const product = updateProduct(id, body);
    return NextResponse.json({ product });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const existing = getProduct(id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
