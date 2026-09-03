"use client";

import { useEffect, useState } from "react";

/**
 * The shareable link. Built on the client because the absolute origin differs
 * between local dev, previews and the production domain.
 */
export function ShareLink({ slug, published }: { slug: string; published: boolean }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin ? `${origin}/i/${slug}` : `/i/${slug}`;

  return (
    <div className="mt-8 rounded-sm border border-[#c9956a]/25 bg-white px-6 py-5">
      <p className="text-[10px] uppercase tracking-[0.32em] text-[#9b5f36]">
        {published ? "Share this link" : "Link (unpublished)"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <code className="break-all text-sm text-[#2b1710]">{url}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked — the link is right there to select */
            }
          }}
          className="rounded-sm border border-[#c9956a]/45 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[#9b5f36] transition-colors hover:bg-[#f3e7db]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {!published && (
        <p className="mt-3 text-xs text-[#8a6b5c]">
          Tick “Published” below and save before sharing — until then the link shows a
          not-found page.
        </p>
      )}
    </div>
  );
}
