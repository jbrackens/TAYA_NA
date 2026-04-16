"use client";

/**
 * PredictSidebar — vertical category navigation for the prediction platform.
 *
 * Replaces SportsSidebar, which enumerated sports (soccer, basketball, etc).
 * This one enumerates prediction categories (politics, crypto, sports as a
 * category, entertainment, tech, economics). Fetches once from /api/v1/categories
 * so the list stays in sync with what admins have enabled server-side.
 *
 * On narrow viewports the sidebar is hidden — the category pills on the
 * discovery page cover mobile navigation.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Landmark,
  Bitcoin,
  Trophy,
  Film,
  Cpu,
  TrendingUp,
  Compass,
  Briefcase,
} from "lucide-react";
import type { Category } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

// Map category slug → lucide icon. Kept in the client to avoid depending on
// whatever icon name the backend happens to return — lets the backend rename
// freely without breaking the UI.
const ICONS: Record<string, typeof Landmark> = {
  politics: Landmark,
  crypto: Bitcoin,
  sports: Trophy,
  entertainment: Film,
  tech: Cpu,
  economics: TrendingUp,
};

function iconFor(slug: string) {
  return ICONS[slug] ?? Briefcase;
}

export function PredictSidebar() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        /* silent — header nav still works if categories fail to load */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (path: string) => {
    const p = pathname ?? "";
    return p === path || p.startsWith(`${path}/`);
  };

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-gray-800 bg-black/40 p-3 gap-1">
      {/* Discover is first so it doubles as a home-for-predict link */}
      <Link
        href="/predict"
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive("/predict")
            ? "bg-emerald-600/20 text-emerald-300"
            : "text-gray-300 hover:bg-gray-800 hover:text-white"
        }`}
      >
        <Compass className="w-4 h-4" />
        Discover
      </Link>

      <div className="mt-4 px-3 text-xs uppercase tracking-wider text-gray-500">
        Categories
      </div>

      {loading ? (
        // 6 skeletons to match seeded category count
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="mx-1 h-8 rounded bg-gray-800/50 animate-pulse"
            />
          ))}
        </>
      ) : (
        categories.map((cat) => {
          const Icon = iconFor(cat.slug);
          const href = `/category/${cat.slug}`;
          return (
            <Link
              key={cat.slug}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(href)
                  ? "bg-emerald-600/20 text-emerald-300"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </Link>
          );
        })
      )}
    </aside>
  );
}
