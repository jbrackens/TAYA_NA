"use client";

import Link from "next/link";
import type { Category } from "@phoenix-ui/api-client/src/prediction-types";

const CATEGORY_ICONS: Record<string, string> = {
  politics: "\u{1F3DB}",
  crypto: "\u{1FA99}",
  sports: "\u{1F3C6}",
  entertainment: "\u{1F3AC}",
  tech: "\u{1F4BB}",
  economics: "\u{1F4C8}",
};

interface CategoryPillsProps {
  categories: Category[];
  activeSlug?: string | null;
  onSelect?: (slug: string | null) => void;
}

export function CategoryPills({
  categories,
  activeSlug,
  onSelect,
}: CategoryPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect?.(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
          !activeSlug
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault();
              onSelect(cat.slug);
            }
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeSlug === cat.slug
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <span className="mr-1">{CATEGORY_ICONS[cat.slug] || ""}</span>
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
