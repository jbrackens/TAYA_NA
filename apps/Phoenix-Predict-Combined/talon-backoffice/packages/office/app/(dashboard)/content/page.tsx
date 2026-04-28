"use client";

import { useEffect, useMemo, useState, CSSProperties } from "react";
import {
  DataTable,
  ErrorBoundary,
  ErrorState,
  SkeletonLoader,
} from "../../components/shared";
import type { ColumnDef } from "../../components/shared";

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
      const res = await fetch("/api/v1/admin/content/pages", {
        headers: { "X-Admin-Role": "admin" },
        credentials: "include",
      });
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
      const res = await fetch("/api/v1/admin/banners", {
        headers: { "X-Admin-Role": "admin" },
        credentials: "include",
      });
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
      const res = await fetch("/api/v1/admin/content/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Role": "admin",
        },
        credentials: "include",
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
      await fetch(`/api/v1/admin/content/pages/${id}/publish`, {
        method: "POST",
        headers: { "X-Admin-Role": "admin" },
        credentials: "include",
      });
      loadPages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Publish failed");
    }
  };

  const createBanner = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Role": "admin",
        },
        credentials: "include",
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
      { key: "title", header: "Title", render: (row) => row.title },
      { key: "slug", header: "Slug", render: (row) => row.slug },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor:
                row.status === "published"
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(251,191,36,0.15)",
              color:
                row.status === "published"
                  ? "var(--accent, #2be480)"
                  : "var(--warn, #d97706)",
            }}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) =>
          row.status === "draft" ? (
            <button
              onClick={() => publishPage(row.page_id)}
              style={actionBtnStyle}
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
      { key: "title", header: "Title", render: (row) => row.title },
      { key: "position", header: "Position", render: (row) => row.position },
      {
        key: "active",
        header: "Active",
        render: (row) => (row.active ? "Yes" : "No"),
      },
    ],
    [],
  );

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    borderBottom: isActive ? "2px solid #39ff14" : "2px solid transparent",
    color: isActive ? "var(--t1, #1a1a1a)" : "var(--t3, #8b8378)",
    background: "none",
    border: "none",
  });

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "var(--t1, #1a1a1a)",
          }}
        >
          Content Management
        </h1>
        <button
          onClick={() =>
            activeTab === "pages"
              ? setShowPageForm(true)
              : setShowBannerForm(true)
          }
          style={createBtnStyle}
        >
          + New {activeTab === "pages" ? "Page" : "Banner"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "1px solid var(--border-1, #e5dfd2)",
          marginBottom: "20px",
        }}
      >
        <button
          style={tabStyle(activeTab === "pages")}
          onClick={() => setActiveTab("pages")}
        >
          Pages
        </button>
        <button
          style={tabStyle(activeTab === "banners")}
          onClick={() => setActiveTab("banners")}
        >
          Banners
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {showPageForm && (
        <div style={formStyle}>
          <h3 style={{ color: "var(--t1, #1a1a1a)", marginBottom: "12px" }}>
            New Page
          </h3>
          <input
            placeholder="Slug (e.g. about-us)"
            value={pageSlug}
            onChange={(e) => setPageSlug(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Title"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Content (HTML)"
            value={pageContent}
            onChange={(e) => setPageContent(e.target.value)}
            style={{ ...inputStyle, height: "100px" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={createPage}
              disabled={saving || !pageSlug || !pageTitle}
              style={createBtnStyle}
            >
              {saving ? "Saving..." : "Create Draft"}
            </button>
            <button
              onClick={() => setShowPageForm(false)}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showBannerForm && (
        <div style={formStyle}>
          <h3 style={{ color: "var(--t1, #1a1a1a)", marginBottom: "12px" }}>
            New Banner
          </h3>
          <input
            placeholder="Title"
            value={bannerTitle}
            onChange={(e) => setBannerTitle(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Image URL"
            value={bannerImageUrl}
            onChange={(e) => setBannerImageUrl(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Link URL"
            value={bannerLinkUrl}
            onChange={(e) => setBannerLinkUrl(e.target.value)}
            style={inputStyle}
          />
          <select
            value={bannerPosition}
            onChange={(e) => setBannerPosition(e.target.value)}
            style={inputStyle}
          >
            <option value="hero">Hero</option>
            <option value="sidebar">Sidebar</option>
            <option value="footer">Footer</option>
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={createBanner}
              disabled={saving || !bannerTitle || !bannerImageUrl}
              style={createBtnStyle}
            >
              {saving ? "Saving..." : "Create Banner"}
            </button>
            <button
              onClick={() => setShowBannerForm(false)}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <SkeletonLoader rows={5} />
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

const createBtnStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #39ff14",
  backgroundColor: "rgba(57, 255, 20, 0.1)",
  color: "#39ff14",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};
const cancelBtnStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid var(--border-1, #e5dfd2)",
  backgroundColor: "transparent",
  color: "var(--t3, #8b8378)",
  fontSize: "13px",
  cursor: "pointer",
};
const actionBtnStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: "4px",
  border: "1px solid #39ff14",
  backgroundColor: "transparent",
  color: "#39ff14",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
};
const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  marginBottom: "8px",
  borderRadius: "6px",
  border: "1px solid var(--border-1, #e5dfd2)",
  backgroundColor: "var(--bg-deep, #f7f3ed)",
  color: "var(--t1, #1a1a1a)",
  fontSize: "13px",
  outline: "none",
};
const formStyle: CSSProperties = {
  padding: "20px",
  backgroundColor: "var(--surface-1, var(--t1, #1a1a1a))",
  border: "1px solid var(--border-1, #e5dfd2)",
  borderRadius: "8px",
  marginBottom: "20px",
};
const errorStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: "6px",
  color: "#fca5a5",
  marginBottom: "16px",
  fontSize: "13px",
};

export default function ContentPage() {
  return (
    <ErrorBoundary>
      <ContentPageContent />
    </ErrorBoundary>
  );
}
