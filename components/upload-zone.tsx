"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "./icons";

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        if (data.redirect) {
          router.push(data.redirect);
          return;
        }
        setError(data.error ?? "Failed to parse APR ZIP.");
        return;
      }
      if (data.id) {
        router.push(`/reports/${data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div
        className={`rounded-3xl border-2 border-dashed p-12 text-center transition-all ${
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border bg-card hover:border-border-strong"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <UploadIcon size={24} />
        </div>
        <div className="text-lg font-semibold text-foreground">
          Drop your APR export ZIP here
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          WellSky / Sage-format ZIP containing Q4a.csv, Q5a.csv, etc.
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Parsing & saving…" : "Choose file"}
        </button>
        {error && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}
      </div>
      <div className="mt-6 text-center text-xs text-muted-foreground">
        APR data is aggregated counts only — no client-level information is ever stored.
      </div>
    </div>
  );
}
