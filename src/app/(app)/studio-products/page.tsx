"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { ensureOk } from "@/lib/api";
import type { Product, ProductInput } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DraftProfileInput = {
  name: string;
  description?: string;
  rawNotes?: string;
  examplePosts?: string[];
};

type View = "list" | "new-step1" | "new-step2";

type Step1Form = {
  name: string;
  description: string;
  rawNotes: string;
  examplePostsRaw: string;
};

type Step2Form = {
  audience: string;
  voiceTone: string;
  language: "english" | "hinglish";
  contentPillars: string;
  dos: string;
  donts: string;
  imageStyle: string;
  defaultMusicMood: string;
};

type State = {
  view: View;
  products: Product[];
  loadingProducts: boolean;
  step1: Step1Form;
  step2: Step2Form;
  drafting: boolean;
  saving: boolean;
  error: string | null;
  deleteId: string | null;
};

type Action =
  | { type: "SET_VIEW"; view: View }
  | { type: "PRODUCTS_LOADED"; products: Product[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "UPDATE_STEP1"; patch: Partial<Step1Form> }
  | { type: "UPDATE_STEP2"; patch: Partial<Step2Form> }
  | { type: "DRAFTING"; drafting: boolean }
  | { type: "SAVING"; saving: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "PRODUCT_ADDED"; product: Product }
  | { type: "PRODUCT_DELETED"; id: string }
  | { type: "SET_DELETE_ID"; id: string | null };

const defaultStep1: Step1Form = {
  name: "",
  description: "",
  rawNotes: "",
  examplePostsRaw: "",
};

const defaultStep2: Step2Form = {
  audience: "",
  voiceTone: "",
  language: "english",
  contentPillars: "",
  dos: "",
  donts: "",
  imageStyle: "",
  defaultMusicMood: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view, error: null };
    case "PRODUCTS_LOADED":
      return { ...state, products: action.products, loadingProducts: false };
    case "SET_LOADING":
      return { ...state, loadingProducts: action.loading };
    case "UPDATE_STEP1":
      return { ...state, step1: { ...state.step1, ...action.patch } };
    case "UPDATE_STEP2":
      return { ...state, step2: { ...state.step2, ...action.patch } };
    case "DRAFTING":
      return { ...state, drafting: action.drafting };
    case "SAVING":
      return { ...state, saving: action.saving };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "PRODUCT_ADDED":
      return {
        ...state,
        products: [action.product, ...state.products],
        view: "list",
        step1: defaultStep1,
        step2: defaultStep2,
        saving: false,
        error: null,
      };
    case "PRODUCT_DELETED":
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.id),
        deleteId: null,
      };
    case "SET_DELETE_ID":
      return { ...state, deleteId: action.id };
    default:
      return state;
  }
}

const initialState: State = {
  view: "list",
  products: [],
  loadingProducts: true,
  step1: defaultStep1,
  step2: defaultStep2,
  drafting: false,
  saving: false,
  error: null,
  deleteId: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioProductsPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/products")
      .then((r) => ensureOk(r))
      .then((data) => {
        const products = Array.isArray(data) ? data : ((data as { products?: Product[] }).products ?? []);
        dispatch({ type: "PRODUCTS_LOADED", products: products as Product[] });
      })
      .catch((err: unknown) => {
        dispatch({ type: "SET_LOADING", loading: false });
        dispatch({
          type: "SET_ERROR",
          error: err instanceof Error ? err.message : "Failed to load products",
        });
      });
  }, []);

  async function handleDraft() {
    const { name, description, rawNotes, examplePostsRaw } = state.step1;
    if (!name.trim()) {
      dispatch({ type: "SET_ERROR", error: "Product name is required" });
      return;
    }

    dispatch({ type: "DRAFTING", drafting: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const body: DraftProfileInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        rawNotes: rawNotes.trim() || undefined,
        examplePosts: examplePostsRaw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const resp = (await ensureOk(
        await fetch("/api/products/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      )) as { product?: Partial<ProductInput> };
      const data = resp.product ?? {};

      dispatch({
        type: "UPDATE_STEP2",
        patch: {
          audience: data.audience ?? "",
          voiceTone: data.voiceTone ?? "",
          language: data.language ?? "english",
          contentPillars: (data.contentPillars ?? []).join("\n"),
          dos: (data.dos ?? []).join("\n"),
          donts: (data.donts ?? []).join("\n"),
          imageStyle: data.imageStyle ?? "",
          defaultMusicMood: data.defaultMusicMood ?? "",
        },
      });
      dispatch({ type: "SET_VIEW", view: "new-step2" });
    } catch (err: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Draft failed",
      });
    } finally {
      dispatch({ type: "DRAFTING", drafting: false });
    }
  }

  async function handleSave() {
    const { step1, step2 } = state;

    dispatch({ type: "SAVING", saving: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const body: ProductInput = {
        name: step1.name.trim(),
        description: step1.description.trim() || undefined,
        audience: step2.audience.trim() || undefined,
        voiceTone: step2.voiceTone.trim() || undefined,
        language: step2.language,
        contentPillars: step2.contentPillars.split("\n").map((s) => s.trim()).filter(Boolean),
        dos: step2.dos.split("\n").map((s) => s.trim()).filter(Boolean),
        donts: step2.donts.split("\n").map((s) => s.trim()).filter(Boolean),
        examplePosts: step1.examplePostsRaw.split("\n").map((s) => s.trim()).filter(Boolean),
        imageStyle: step2.imageStyle.trim() || undefined,
        defaultMusicMood: step2.defaultMusicMood.trim() || undefined,
        brandAssets: [],
      };

      const resp = (await ensureOk(
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      )) as { product: Product };

      dispatch({ type: "PRODUCT_ADDED", product: resp.product });
    } catch (err: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Save failed",
      });
      dispatch({ type: "SAVING", saving: false });
    }
  }

  async function handleDelete(id: string) {
    try {
      await ensureOk(await fetch(`/api/products/${id}`, { method: "DELETE" }));
      dispatch({ type: "PRODUCT_DELETED", id });
    } catch (err: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Delete failed",
      });
    }
  }

  const { view, products, loadingProducts, step1, step2, drafting, saving, error, deleteId } = state;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-slate-500">
            Define your brand products to personalise AI-generated reels
          </p>
        </div>
        {view === "list" && (
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_VIEW", view: "new-step1" })}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700"
          >
            <Plus className="size-4" strokeWidth={2.4} />
            New product
          </button>
        )}
        {view !== "list" && (
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_VIEW", view: "list" })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="size-4" />
            Back to list
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          {loadingProducts ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-violet-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e8e8f0] p-14 text-center">
              <p className="text-sm font-medium text-slate-700">No products yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Create your first product to start generating reels.
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_VIEW", view: "new-step1" })}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700"
              >
                <Plus className="size-4" strokeWidth={2.4} />
                New product
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  confirmingDelete={deleteId === p.id}
                  onDeleteRequest={() => dispatch({ type: "SET_DELETE_ID", id: p.id })}
                  onDeleteCancel={() => dispatch({ type: "SET_DELETE_ID", id: null })}
                  onDeleteConfirm={() => handleDelete(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NEW PRODUCT STEP 1 ── */}
      {view === "new-step1" && (
        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <FlowHeader step={1} />
          <div className="mt-8 max-w-2xl space-y-5">
            <Field label="Product name *">
              <input
                type="text"
                value={step1.name}
                onChange={(e) => dispatch({ type: "UPDATE_STEP1", patch: { name: e.target.value } })}
                placeholder="e.g. ReelForge Pro"
                className={inputCls}
              />
            </Field>
            <Field label="Short description">
              <input
                type="text"
                value={step1.description}
                onChange={(e) => dispatch({ type: "UPDATE_STEP1", patch: { description: e.target.value } })}
                placeholder="One-liner about your product"
                className={inputCls}
              />
            </Field>
            <Field label="Raw notes" hint="Brain-dump: tone, audience, key messages, anything">
              <textarea
                rows={5}
                value={step1.rawNotes}
                onChange={(e) => dispatch({ type: "UPDATE_STEP1", patch: { rawNotes: e.target.value } })}
                placeholder="Our product is an AI video tool for indie creators. We want a fun, energetic tone…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
            <Field label="Example posts" hint="Paste one per line — used to match your voice">
              <textarea
                rows={4}
                value={step1.examplePostsRaw}
                onChange={(e) => dispatch({ type: "UPDATE_STEP1", patch: { examplePostsRaw: e.target.value } })}
                placeholder={"Tired of spending hours editing? Here's how I make reels in 2 mins…\nThis feature changed everything for my workflow…"}
                className={cn(inputCls, "resize-none")}
              />
            </Field>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDraft}
                disabled={drafting || !step1.name.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700 disabled:opacity-50"
              >
                {drafting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Drafting profile…
                  </>
                ) : (
                  <>
                    Draft with AI
                    <ChevronRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW PRODUCT STEP 2 ── */}
      {view === "new-step2" && (
        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <FlowHeader step={2} />
          <p className="mt-1 text-sm text-slate-500">
            AI drafted this profile for <span className="font-medium text-slate-700">{step1.name}</span>. Review and edit before saving.
          </p>
          <div className="mt-8 max-w-2xl space-y-5">
            <Field label="Target audience">
              <input
                type="text"
                value={step2.audience}
                onChange={(e) => dispatch({ type: "UPDATE_STEP2", patch: { audience: e.target.value } })}
                className={inputCls}
              />
            </Field>
            <Field label="Voice / tone">
              <input
                type="text"
                value={step2.voiceTone}
                onChange={(e) => dispatch({ type: "UPDATE_STEP2", patch: { voiceTone: e.target.value } })}
                className={inputCls}
              />
            </Field>
            <Field label="Language">
              <select
                value={step2.language}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_STEP2",
                    patch: { language: e.target.value as "english" | "hinglish" },
                  })
                }
                className={inputCls}
              >
                <option value="english">English</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </Field>
            <Field label="Content pillars" hint="One per line">
              <textarea
                rows={3}
                value={step2.contentPillars}
                onChange={(e) => dispatch({ type: "UPDATE_STEP2", patch: { contentPillars: e.target.value } })}
                className={cn(inputCls, "resize-none")}
              />
            </Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Do's" hint="One per line">
                <textarea
                  rows={4}
                  value={step2.dos}
                  onChange={(e) => dispatch({ type: "UPDATE_STEP2", patch: { dos: e.target.value } })}
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
              <Field label="Don'ts" hint="One per line">
                <textarea
                  rows={4}
                  value={step2.donts}
                  onChange={(e) => dispatch({ type: "UPDATE_STEP2", patch: { donts: e.target.value } })}
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
            </div>
            <Field label="Image style">
              <input
                type="text"
                value={step2.imageStyle}
                onChange={(e) => dispatch({ type: "UPDATE_STEP2", patch: { imageStyle: e.target.value } })}
                placeholder="e.g. cinematic, warm tones, shallow depth of field"
                className={inputCls}
              />
            </Field>
            <Field label="Default music mood">
              <input
                type="text"
                value={step2.defaultMusicMood}
                onChange={(e) => dispatch({ type: "UPDATE_STEP2", patch: { defaultMusicMood: e.target.value } })}
                placeholder="e.g. upbeat, cinematic, chill"
                className={inputCls}
              />
            </Field>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_VIEW", view: "new-step1" })}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Save product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-[#e8e8f0] bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="ml-1.5 font-normal text-slate-400">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function FlowHeader({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      <StepDot num={1} active={step === 1} done={step > 1} label="Basic info" />
      <div className="h-px flex-1 border-t border-dashed border-[#e8e8f0]" />
      <StepDot num={2} active={step === 2} done={false} label="AI profile" />
    </div>
  );
}

function StepDot({
  num,
  active,
  done,
  label,
}: {
  num: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
          active
            ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
            : done
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-400",
        )}
      >
        {done ? <Check className="size-4" /> : num}
      </span>
      <span
        className={cn(
          "text-xs font-medium",
          active || done ? "text-slate-700" : "text-slate-400",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function ProductCard({
  product,
  confirmingDelete,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  product: Product;
  confirmingDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-[#e8e8f0] bg-white p-5 transition hover:border-violet-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{product.name}</p>
          {product.description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{product.description}</p>
          )}
        </div>
        <LanguageBadge language={product.language} />
      </div>

      {product.contentPillars.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.contentPillars.slice(0, 3).map((p) => (
            <span
              key={p}
              className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[0.7rem] font-medium text-violet-700"
            >
              {p}
            </span>
          ))}
          {product.contentPillars.length > 3 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.7rem] text-slate-500">
              +{product.contentPillars.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-[0.7rem] text-slate-400">
          {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : ""}
        </span>
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Delete?</span>
            <button
              type="button"
              onClick={onDeleteCancel}
              className="rounded-lg border border-[#e8e8f0] px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDeleteConfirm}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
            >
              Confirm
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onDeleteRequest}
            aria-label="Delete product"
            className="flex size-7 items-center justify-center rounded-lg border border-transparent text-slate-400 opacity-0 transition-all group-hover:border-[#e8e8f0] group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function LanguageBadge({ language }: { language: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ring-1 ring-inset",
        language === "hinglish"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-slate-50 text-slate-600 ring-slate-200",
      )}
    >
      {language}
    </span>
  );
}
