import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

type Category = "sports" | "politics" | "finance" | "crypto" | "general";

type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  category: Category;
  publishedAt: string;
  summary?: string;
};

const categories: { id: Category; label: string }[] = [
  { id: "sports", label: "Sports" },
  { id: "politics", label: "Politics" },
  { id: "finance", label: "Markets" },
  { id: "crypto", label: "Crypto" },
];

export const NewsSidebar: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [active, setActive] = useState<Set<Category>>(
    () => new Set(["sports", "politics", "finance", "crypto"]),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const query = Array.from(active).join(",");
        const response = await fetch(`/api/news?categories=${query}`);
        const payload = await response.json();

        if (!cancelled) {
          setItems(Array.isArray(payload.items) ? payload.items : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
      }
    }

    load();
    const timer = window.setInterval(load, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active]);

  const visibleItems = useMemo(
    () => items.filter((item) => active.has(item.category)),
    [active, items],
  );

  const toggleCategory = (category: Category) => {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <NewsPanel>
      <NewsHeader>
        <NewsTitle>News</NewsTitle>
        <NewsFilters>
          {categories.map((category) => (
            <NewsFilterButton
              key={category.id}
              $active={active.has(category.id)}
              type="button"
              onClick={() => toggleCategory(category.id)}
            >
              {category.label}
            </NewsFilterButton>
          ))}
        </NewsFilters>
      </NewsHeader>

      <NewsList>
        {loading ? <NewsEmpty>Loading news...</NewsEmpty> : null}
        {!loading && visibleItems.length === 0 ? (
          <NewsEmpty>No news for selected filters.</NewsEmpty>
        ) : null}
        {visibleItems.map((item) => (
          <NewsLink key={item.id} href={item.url} target="_blank" rel="noopener noreferrer">
            <NewsMeta>
              <span>{item.source}</span>
              <span>{timeAgo(item.publishedAt)}</span>
              <NewsDot $category={item.category} />
            </NewsMeta>
            <NewsHeadline>{item.title}</NewsHeadline>
            {item.summary ? <NewsSummary>{item.summary}</NewsSummary> : null}
          </NewsLink>
        ))}
      </NewsList>
    </NewsPanel>
  );
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  }
  return `${Math.floor(seconds / 86400)}d`;
}

const NewsPanel = styled.section`
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid rgba(99, 120, 136, 0.22);
  border-radius: var(--radius-lg);
  background: rgba(15, 31, 42, 0.76);
  overflow: hidden;
`;

const NewsHeader = styled.header`
  padding: var(--space-3);
  display: grid;
  gap: var(--space-3);
  border-bottom: 1px solid rgba(99, 120, 136, 0.18);
`;

const NewsTitle = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 800;
`;

const NewsFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const NewsFilterButton = styled.button<{ $active?: boolean }>`
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(0, 231, 0, 0.38)" : "rgba(99, 120, 136, 0.28)"};
  background: ${(props) =>
    props.$active ? "rgba(0, 231, 0, 0.12)" : "rgba(45, 74, 90, 0.28)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-xs);
  font-weight: 800;
  cursor: pointer;
`;

const NewsList = styled.div`
  min-height: 0;
  overflow-y: auto;
`;

const NewsLink = styled.a`
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(99, 120, 136, 0.12);

  &:hover {
    background: rgba(45, 74, 90, 0.32);
    color: inherit;
  }
`;

const NewsMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  text-transform: uppercase;
`;

const NewsHeadline = styled.h4`
  margin: 0;
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.35;
`;

const NewsSummary = styled.p`
  margin: 0;
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsEmpty = styled.div`
  padding: var(--space-3);
  color: var(--color-muted);
  font-size: var(--font-size-sm);
`;

const dotColors: Record<Category, string> = {
  sports: "#f7a645",
  politics: "#4fb5ff",
  finance: "#00e700",
  crypto: "#f3d34a",
  general: "#8ea5b4",
};

const NewsDot = styled.span<{ $category: Category }>`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${(props) => dotColors[props.$category]};
`;
