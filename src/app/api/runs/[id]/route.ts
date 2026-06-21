import { NextResponse } from "next/server";
import { getRun } from "@/lib/runs";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const run = getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to get run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
