import { NextResponse } from "next/server";
import { getRun, editStep } from "@/lib/runs";

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
      script?: string;
      /** Update a scene caption: { index: number; text: string } */
      caption?: { index: number; text: string };
      musicMood?: string;
    };

    if (
      body.script == null &&
      body.caption == null &&
      body.musicMood == null
    ) {
      return NextResponse.json(
        { error: "At least one of script, caption, or musicMood is required" },
        { status: 400 },
      );
    }

    const run = editStep(id, {
      ...(body.script != null && { script: body.script }),
      ...(body.caption != null && { caption: body.caption }),
      ...(body.musicMood != null && { musicMood: body.musicMood }),
    });

    return NextResponse.json({ run });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to edit step";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
