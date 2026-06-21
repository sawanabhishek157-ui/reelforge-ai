import { NextResponse } from "next/server";
import { getRun, regenerateStep } from "@/lib/runs";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const existing = getRun(id);
    if (!existing) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const body = (await req.json()) as { feedback?: string };

    const run = regenerateStep(id, body.feedback);
    return NextResponse.json({ run });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to regenerate step";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
