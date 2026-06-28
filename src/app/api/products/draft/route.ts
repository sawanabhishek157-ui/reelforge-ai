import { NextResponse } from "next/server";
import { draftProfile, type DraftProfileInput } from "@/lib/profile";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<DraftProfileInput>;

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const input: DraftProfileInput = {
      name: body.name.trim(),
      ...(body.description != null && { description: body.description }),
      ...(body.rawNotes != null && { rawNotes: body.rawNotes }),
      ...(Array.isArray(body.examplePosts) && { examplePosts: body.examplePosts }),
      ...(body.repoReadme != null && { repoReadme: body.repoReadme }),
      ...(body.storeListing != null && { storeListing: body.storeListing }),
      ...(body.siteText != null && { siteText: body.siteText }),
    };

    const drafted = await draftProfile(input);
    return NextResponse.json({ product: drafted });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to draft profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
