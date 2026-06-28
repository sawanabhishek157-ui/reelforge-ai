"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Film, Loader2, Plus } from "lucide-react";

import { cn } from "@/lib/cn";
import { ensureOk } from "@/lib/api";
import type { ContentRun, Product } from "@/lib/types";

export default function StudioPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/products")
      .then((r) => ensureOk(r))
      .then((data) => {
        const list = Array.isArray(data) ? data : ((data as { products?: Product[] }).products ?? []);
        setProducts(list as Product[]);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load products");
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  async function handleStart() {
    if (!selectedId) return;
    setStarting(true);
    setError(null);

    try {
      const data = (await ensureOk(
        await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: selectedId }),
        }),
      )) as { run: ContentRun };

      router.push(`/studio/${data.run.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Studio</h1>
        <p className="text-sm text-slate-500">
          Pick a product, then start generating a reel
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h2 className="text-base font-semibold">Choose a product</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your AI reel will be personalised to this product's brand voice and audience.
        </p>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-violet-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e8e8f0] p-12 text-center">
            <Film className="size-8 text-slate-300" strokeWidth={1.4} />
            <p className="mt-3 text-sm font-medium text-slate-700">No products yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Create a product first so the AI knows your brand.
            </p>
            <a
              href="/studio-products"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700"
            >
              <Plus className="size-4" strokeWidth={2.4} />
              New product
            </a>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all",
                  selectedId === p.id
                    ? "border-violet-400 bg-violet-50 shadow-sm shadow-violet-200/60"
                    : "border-[#e8e8f0] bg-white hover:border-violet-200 hover:shadow-sm",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-slate-800">{p.name}</p>
                  {selectedId === p.id && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600">
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        className="size-3 text-white"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="truncate text-xs text-slate-500">{p.description}</p>
                )}
                {p.contentPillars.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.contentPillars.slice(0, 2).map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.68rem] font-medium text-violet-600"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-8 flex items-center gap-4 border-t border-[#e8e8f0] pt-6">
            <button
              type="button"
              onClick={handleStart}
              disabled={!selectedId || starting}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {starting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  Start a reel
                  <ChevronRight className="size-4" />
                </>
              )}
            </button>
            {!selectedId && (
              <p className="text-sm text-slate-400">Select a product to continue</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
