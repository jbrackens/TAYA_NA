"use client";

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
  const buttonClass =
    "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-[#1a1f3a] bg-[#0f1225] px-3 py-2 text-center text-[13px] font-semibold text-[#e2e8f0] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:border-[var(--accent)] enabled:hover:text-[var(--accent)]";
  const activeButtonClass =
    "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-center text-[13px] font-semibold text-[#0f1225] transition-all duration-200";

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

  const pages = getPageNumbers();
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        className={buttonClass}
      >
        Previous
      </button>

      {pages.map((page, idx) => {
        if (page === "...") {
          return (
            <div
              key={`ellipsis-${idx}`}
              className="px-3 py-2 text-[13px] text-[#D3D3D3]"
            >
              ...
            </div>
          );
        }

        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={isActive ? activeButtonClass : buttonClass}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className={buttonClass}
      >
        Next
      </button>
    </div>
  );
}
