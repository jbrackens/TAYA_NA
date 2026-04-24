"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= halfVisible + 1) {
        for (let i = 1; i <= maxVisible; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - halfVisible) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++)
          pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (
          let i = currentPage - halfVisible;
          i <= currentPage + halfVisible;
          i++
        ) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "16px",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    minWidth: "36px",
    height: "36px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#e2e8f0",
    backgroundColor: "#0f1225",
    border: "1px solid #1a1f3a",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "var(--accent)",
    borderColor: "var(--accent)",
    color: "#0f1225",
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  const ellipsisStyle: React.CSSProperties = {
    padding: "8px 12px",
    color: "#D3D3D3",
    fontSize: "13px",
  };

  const pages = getPageNumbers();
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div style={containerStyle}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        style={canGoPrev ? buttonStyle : disabledButtonStyle}
        onMouseEnter={(e) => {
          if (canGoPrev) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = "var(--accent)";
            btn.style.color = "var(--accent)";
          }
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = "#1a1f3a";
          btn.style.color = "#e2e8f0";
        }}
      >
        Previous
      </button>

      {pages.map((page, idx) => {
        if (page === "...") {
          return (
            <div key={`ellipsis-${idx}`} style={ellipsisStyle}>
              ...
            </div>
          );
        }

        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            style={isActive ? activeButtonStyle : buttonStyle}
            onMouseEnter={(e) => {
              if (!isActive) {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.borderColor = "var(--accent)";
                btn.style.color = "var(--accent)";
              }
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.borderColor = "#1a1f3a";
              btn.style.color = "#e2e8f0";
            }}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        style={canGoNext ? buttonStyle : disabledButtonStyle}
        onMouseEnter={(e) => {
          if (canGoNext) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = "var(--accent)";
            btn.style.color = "var(--accent)";
          }
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = "#1a1f3a";
          btn.style.color = "#e2e8f0";
        }}
      >
        Next
      </button>
    </div>
  );
}
