import { NextResponse } from "next/server";
import { listProducts, createProduct } from "@/lib/products";
import type { ProductInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const products = listProducts();
    return NextResponse.json({ products });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to list products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ProductInput>;

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!body.language || (body.language !== "english" && body.language !== "hinglish")) {
      return NextResponse.json(
        { error: "language must be 'english' or 'hinglish'" },
        { status: 400 },
      );
    }

    const input: ProductInput = {
      name: body.name.trim(),
      language: body.language,
      contentPillars: Array.isArray(body.contentPillars) ? body.contentPillars : [],
      dos: Array.isArray(body.dos) ? body.dos : [],
      donts: Array.isArray(body.donts) ? body.donts : [],
      examplePosts: Array.isArray(body.examplePosts) ? body.examplePosts : [],
      brandAssets: Array.isArray(body.brandAssets) ? body.brandAssets : [],
      ...(body.slug != null && { slug: body.slug }),
      ...(body.description != null && { description: body.description }),
      ...(body.audience != null && { audience: body.audience }),
      ...(body.voiceTone != null && { voiceTone: body.voiceTone }),
      ...(body.defaultVoiceId != null && { defaultVoiceId: body.defaultVoiceId }),
      ...(body.defaultMusicMood != null && { defaultMusicMood: body.defaultMusicMood }),
      ...(body.imageStyle != null && { imageStyle: body.imageStyle }),
      ...(body.repoUrl != null && { repoUrl: body.repoUrl }),
      ...(body.storeUrl != null && { storeUrl: body.storeUrl }),
      ...(body.siteUrl != null && { siteUrl: body.siteUrl }),
    };

    const product = createProduct(input);
    return NextResponse.json({ product }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
