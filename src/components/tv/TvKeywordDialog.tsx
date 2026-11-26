"use client";

import { useRef, useState } from "react";

export default function TvKeywordDialog({
  channelTitle,
  initialKeywords,
  onSave,
  onClose,
}: {
  channelTitle: string;
  initialKeywords: string[];
  onSave: (keywords: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState(initialKeywords.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const keywords = value
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    setSaving(true);
    setError(null);
    try {
      await onSave(keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save keywords");
      setSaving(false);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    scopeRef.current?.querySelector<HTMLElement>('button[type="submit"]')?.focus();
  }

  return (
    <div
      ref={scopeRef}
      data-focus-scope
      role="dialog"
      aria-modal="true"
      aria-label={`Keyword filters for ${channelTitle}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8 backdrop-blur-md"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-2xl"
      >
        <h2 className="mb-1 text-2xl font-medium tracking-tight">{channelTitle}</h2>
        <p className="mb-5 text-sm leading-relaxed text-white/50">
          Enter keywords that should appear in a video&apos;s title for it to show up from this
          channel. Separate multiple keywords with commas — a video matching any one of them will
          be shown. Leave empty to show every video.
        </p>

        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

        <input
          autoFocus
          id="tv-keywords"
          name="keywords"
          autoComplete="off"
          data-focusable
          data-autofocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="e.g. tutorial, review"
          readOnly={saving}
          className="mb-6 w-full rounded-2xl border border-white/15 bg-black/30 px-5 py-3 text-lg text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-2 focus:ring-white/30 read-only:opacity-60"
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            data-focusable
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/70 transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-focusable
            aria-busy={saving}
            className="rounded-full bg-white/90 px-6 py-3 text-sm font-medium text-black transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
