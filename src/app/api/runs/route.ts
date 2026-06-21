import { NextResponse } from "next/server";
import { listRuns, createRun } from "@/lib/runs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") ?? undefined;
    const runs = listRuns(productId);
    return NextResponse.json({ runs });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to list runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { productId?: string };

    if (!body.productId || typeof body.productId !== "string") {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const run = createRun(body.productId);
    return NextResponse.json({ run }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
