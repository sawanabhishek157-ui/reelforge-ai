import { NextResponse } from "next/server";
import { getRun, approveStep } from "@/lib/runs";

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

    const body = (await req.json()) as {
      ideaIndex?: number;
      musicMood?: string;
    };

    const run = await approveStep(id, {
      ...(body.ideaIndex != null && { ideaIndex: body.ideaIndex }),
      ...(body.musicMood != null && { musicMood: body.musicMood }),
    });

    return NextResponse.json({ run });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to approve step";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
