"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  ErrorBoundary,
  SkeletonLoader,
} from "../../components/shared";
import type { ColumnDef } from "../../components/shared";
import { adminFetch } from "../../lib/admin-fetch";

interface ContentPageRow {
  page_id: number;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
  created_by: string;
  updated_at: string;
}

interface BannerRow {
  banner_id: number;
  title: string;
  position: string;
  active: boolean;
  image_url: string;
  created_at: string;
}

type Tab = "pages" | "banners";

function ContentPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("pages");
  const [pages, setPages] = useState<ContentPageRow[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Page form state ---
  const [showPageForm, setShowPageForm] = useState(false);
  const [pageSlug, setPageSlug] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [saving, setSaving] = useState(false);

  // --- Banner form state ---
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [bannerPosition, setBannerPosition] = useState("hero");

  const loadPages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/content/pages");
      if (!res.ok) throw new Error("Failed to load pages");
      const data = await res.json();
      setPages(Array.isArray(data?.pages) ? data.pages : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pages");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBanners = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/banners");
      if (!res.ok) throw new Error("Failed to load banners");
      const data = await res.json();
      setBanners(Array.isArray(data?.banners) ? data.banners : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load banners");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pages") loadPages();
    else loadBanners();
  }, [activeTab]);

  const createPage = async () => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/v1/admin/content/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: pageSlug,
          title: pageTitle,
          content: pageContent,
          status: "draft",
        }),
      });
      if (!res.ok) throw new Error("Failed to create page");
      setShowPageForm(false);
      setPageSlug("");
      setPageTitle("");
      setPageContent("");
      loadPages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const publishPage = async (id: number) => {
    try {
      await adminFetch(`/api/v1/admin/content/pages/${id}/publish`, {
        method: "POST",
      });
      loadPages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Publish failed");
    }
  };

  const createBanner = async () => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/v1/admin/banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: bannerTitle,
          image_url: bannerImageUrl,
          link_url: bannerLinkUrl,
          position: bannerPosition,
          active: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to create banner");
      setShowBannerForm(false);
      setBannerTitle("");
      setBannerImageUrl("");
      setBannerLinkUrl("");
      loadBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const pageColumns: ColumnDef<ContentPageRow>[] = useMemo(
    () => [
      { key: "title", label: "Title", render: (_value, row) => row.title },
      { key: "slug", label: "Slug", render: (_value, row) => row.slug },
      {
        key: "status",
        label: "Status",
        render: (_value, row) => (
          <span className={statusBadgeClassName(row.status === "published")}>
            {row.status}
          </span>
        ),
      },
      {
        key: "page_id",
        label: "",
        render: (_value, row) =>
          row.status === "draft" ? (
            <button
              onClick={() => publishPage(row.page_id)}
              className={actionBtnClassName}
            >
              Publish
            </button>
          ) : null,
      },
    ],
    [],
  );

  const bannerColumns: ColumnDef<BannerRow>[] = useMemo(
    () => [
      { key: "title", label: "Title", render: (_value, row) => row.title },
      {
        key: "position",
        label: "Position",
        render: (_value, row) => row.position,
      },
      {
        key: "active",
        label: "Active",
        render: (_value, row) => (row.active ? "Yes" : "No"),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[var(--t1,#1a1a1a)]">
          Content Management
        </h1>
        <button
          onClick={() =>
            activeTab === "pages"
              ? setShowPageForm(true)
              : setShowBannerForm(true)
          }
          className={createBtnClassName}
        >
          + New {activeTab === "pages" ? "Page" : "Banner"}
        </button>
      </div>

      <div className="mb-5 flex gap-1 border-b border-[var(--border-1,#e5dfd2)]">
        <button
          className={tabClassName(activeTab === "pages")}
          onClick={() => setActiveTab("pages")}
        >
          Pages
        </button>
        <button
          className={tabClassName(activeTab === "banners")}
          onClick={() => setActiveTab("banners")}
        >
          Banners
        </button>
      </div>

      {error && <div className={errorClassName}>{error}</div>}

      {showPageForm && (
        <div className={formClassName}>
          <h3 className="mb-3 text-[var(--t1,#1a1a1a)]">New Page</h3>
          <input
            placeholder="Slug (e.g. about-us)"
            value={pageSlug}
            onChange={(e) => setPageSlug(e.target.value)}
            className={inputClassName}
          />
          <input
            placeholder="Title"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className={inputClassName}
          />
          <textarea
            placeholder="Content (HTML)"
            value={pageContent}
            onChange={(e) => setPageContent(e.target.value)}
            className={`${inputClassName} h-[100px]`}
          />
          <div className="flex gap-2">
            <button
              onClick={createPage}
              disabled={saving || !pageSlug || !pageTitle}
              className={createBtnClassName}
            >
              {saving ? "Saving..." : "Create Draft"}
            </button>
            <button
              onClick={() => setShowPageForm(false)}
              className={cancelBtnClassName}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showBannerForm && (
        <div className={formClassName}>
          <h3 className="mb-3 text-[var(--t1,#1a1a1a)]">New Banner</h3>
          <input
            placeholder="Title"
            value={bannerTitle}
            onChange={(e) => setBannerTitle(e.target.value)}
            className={inputClassName}
          />
          <input
            placeholder="Image URL"
            value={bannerImageUrl}
            onChange={(e) => setBannerImageUrl(e.target.value)}
            className={inputClassName}
          />
          <input
            placeholder="Link URL"
            value={bannerLinkUrl}
            onChange={(e) => setBannerLinkUrl(e.target.value)}
            className={inputClassName}
          />
          <select
            value={bannerPosition}
            onChange={(e) => setBannerPosition(e.target.value)}
            className={inputClassName}
          >
            <option value="hero">Hero</option>
            <option value="sidebar">Sidebar</option>
            <option value="footer">Footer</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={createBanner}
              disabled={saving || !bannerTitle || !bannerImageUrl}
              className={createBtnClassName}
            >
              {saving ? "Saving..." : "Create Banner"}
            </button>
            <button
              onClick={() => setShowBannerForm(false)}
              className={cancelBtnClassName}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <SkeletonLoader count={5} />
      ) : activeTab === "pages" ? (
        <DataTable
          data={pages}
          columns={pageColumns}
          emptyMessage="No pages yet. Create your first page."
        />
      ) : (
        <DataTable
          data={banners}
          columns={bannerColumns}
          emptyMessage="No banners yet. Create your first banner."
        />
      )}
    </div>
  );
}

const createBtnClassName =
  "cursor-pointer rounded-md border border-[#39ff14] bg-[rgba(57,255,20,0.1)] px-4 py-2 text-[13px] font-semibold text-[#39ff14] disabled:cursor-not-allowed disabled:opacity-60";
const cancelBtnClassName =
  "cursor-pointer rounded-md border border-[var(--border-1,#e5dfd2)] bg-transparent px-4 py-2 text-[13px] text-[var(--t3,#8b8378)]";
const actionBtnClassName =
  "cursor-pointer rounded border border-[#39ff14] bg-transparent px-2.5 py-1 text-[11px] font-semibold text-[#39ff14]";
const inputClassName =
  "mb-2 w-full rounded-md border border-[var(--border-1,#e5dfd2)] bg-[var(--bg-deep,#f7f3ed)] px-3 py-2 text-[13px] text-[var(--t1,#1a1a1a)] outline-none";
const formClassName =
  "mb-5 rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,var(--t1,#1a1a1a))] p-5";
const errorClassName =
  "mb-4 rounded-md border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] p-3 text-[13px] text-[#fca5a5]";

function statusBadgeClassName(published: boolean): string {
  return [
    "rounded px-2 py-0.5 text-[11px] font-semibold",
    published
      ? "bg-[rgba(34,197,94,0.15)] text-[var(--accent,#2be480)]"
      : "bg-[rgba(251,191,36,0.15)] text-[var(--warn,#d97706)]",
  ].join(" ");
}

function tabClassName(isActive: boolean): string {
  return [
    "cursor-pointer border-b-2 border-l-0 border-r-0 border-t-0 bg-transparent px-4 py-2 text-sm font-semibold",
    isActive
      ? "border-b-[#39ff14] text-[var(--t1,#1a1a1a)]"
      : "border-b-transparent text-[var(--t3,#8b8378)]",
  ].join(" ");
}

export default function ContentPage() {
  return (
    <ErrorBoundary>
      <ContentPageContent />
    </ErrorBoundary>
  );
}
