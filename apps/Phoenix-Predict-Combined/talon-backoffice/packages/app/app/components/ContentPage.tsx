"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getPage,
  type ContentPage as ContentPageType,
} from "../lib/api/content-client";

interface ContentPageProps {
  slug: string;
  fallbackContent?: string;
}

/**
 * Renders a CMS-driven content page by slug.
 * Falls back to provided static content if the CMS page is not found.
 */
export const ContentPageRenderer: React.FC<ContentPageProps> = ({
  slug,
  fallbackContent,
}) => {
  const { t } = useTranslation("content");
  const [page, setPage] = useState<ContentPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPage(slug)
      .then((data) => {
        if (!cancelled) {
          setPage(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <article className="glass max-w-4xl mx-auto p-8">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse mb-4" />
        <div className="h-4 w-full bg-white/5 rounded animate-pulse mb-2" />
        <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
        <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
      </article>
    );
  }

  // CMS page loaded — render it
  if (page) {
    return (
      <article className="glass max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-white mb-6 tracking-tight">
          {page.title}
        </h1>

        {/* Render flat content if no blocks */}
        {(!page.blocks || page.blocks.length === 0) && page.content && (
          <div
            className="prose prose-invert max-w-none text-white/70"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}

        {/* Render blocks */}
        {page.blocks && page.blocks.length > 0 && (
          <div className="flex flex-col gap-6">
            {page.blocks.map((block) => {
              switch (block.blockType) {
                case "text":
                  return (
                    <div
                      key={block.blockId}
                      className="prose prose-invert max-w-none text-white/70"
                      dangerouslySetInnerHTML={{
                        __html:
                          (block.content as Record<string, string>).body || "",
                      }}
                    />
                  );
                case "html":
                  return (
                    <div
                      key={block.blockId}
                      className="text-white/70"
                      dangerouslySetInnerHTML={{
                        __html:
                          (block.content as Record<string, string>).html || "",
                      }}
                    />
                  );
                case "faq": {
                  const faqItems = (block.content as Record<string, unknown>)
                    .items as
                    | Array<{ question: string; answer: string }>
                    | undefined;
                  if (!faqItems) return null;
                  return (
                    <div key={block.blockId} className="flex flex-col gap-3">
                      {faqItems.map((item, idx) => (
                        <details
                          key={idx}
                          className="bg-black/25 rounded-lg p-4 border border-white/10"
                        >
                          <summary className="text-white font-medium cursor-pointer">
                            {item.question}
                          </summary>
                          <p className="text-white/50 mt-2">{item.answer}</p>
                        </details>
                      ))}
                    </div>
                  );
                }
                default:
                  return null;
              }
            })}
          </div>
        )}
      </article>
    );
  }

  // Fallback — use static content if CMS page not found
  if (error && fallbackContent) {
    return (
      <article className="glass max-w-4xl mx-auto p-8">
        <div
          className="prose prose-invert max-w-none text-white/70"
          dangerouslySetInnerHTML={{ __html: fallbackContent }}
        />
      </article>
    );
  }

  // No CMS page and no fallback
  return (
    <article className="glass max-w-4xl mx-auto p-8 text-center">
      <p className="text-white/50">{t("contentUnavailable")}</p>
    </article>
  );
};
