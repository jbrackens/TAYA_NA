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
      <div className="max-w-4xl mx-auto p-6">
        <div className="h-8 w-64 bg-[#1a1f3a] rounded animate-pulse mb-4" />
        <div className="h-4 w-full bg-[#1a1f3a] rounded animate-pulse mb-2" />
        <div className="h-4 w-3/4 bg-[#1a1f3a] rounded animate-pulse mb-2" />
        <div className="h-4 w-1/2 bg-[#1a1f3a] rounded animate-pulse" />
      </div>
    );
  }

  // CMS page loaded — render it
  if (page) {
    return (
      <article className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">{page.title}</h1>

        {/* Render flat content if no blocks */}
        {(!page.blocks || page.blocks.length === 0) && page.content && (
          <div
            className="prose prose-invert max-w-none text-gray-300"
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
                      className="prose prose-invert max-w-none text-gray-300"
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
                      className="text-gray-300"
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
                          className="bg-[#0f1225] rounded-lg p-4 border border-[#1a1f3a]"
                        >
                          <summary className="text-white font-medium cursor-pointer">
                            {item.question}
                          </summary>
                          <p className="text-gray-400 mt-2">{item.answer}</p>
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
      <article className="max-w-4xl mx-auto p-6">
        <div
          className="prose prose-invert max-w-none text-gray-300"
          dangerouslySetInnerHTML={{ __html: fallbackContent }}
        />
      </article>
    );
  }

  // No CMS page and no fallback
  return (
    <div className="max-w-4xl mx-auto p-6 text-center">
      <p className="text-gray-400">{t("contentUnavailable")}</p>
    </div>
  );
};
