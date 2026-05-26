"use client";

import { useState, useMemo } from "react";

const headerCellClass =
  "cursor-pointer select-none border-b border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] p-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)] hover:bg-[var(--accent-soft,rgba(43,228,128,0.14))]";
const bodyCellClass =
  "border-b border-[var(--border-1,#e5dfd2)] p-3 text-sm text-[var(--t1,#1a1a1a)]";
const paginationButtonClass =
  "cursor-pointer rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-3 py-1.5 text-xs font-semibold text-[var(--t1,#1a1a1a)] transition-all duration-200 hover:enabled:border-[var(--focus-ring,#0e7a53)] hover:enabled:bg-[var(--surface-2,#fcfaf5)] hover:enabled:text-[var(--focus-ring,#0e7a53)] disabled:cursor-not-allowed disabled:opacity-50";

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, any>> {
  columns: ColumnDef<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 10,
  onRowClick,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    let sorted = [...data];

    if (sortKey && columns.some((col) => col.key === sortKey && col.sortable)) {
      sorted.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [data, sortKey, sortOrder, columns]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: keyof T) => {
    const column = columns.find((col) => col.key === key);
    if (!column?.sortable) return;

    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full overflow-hidden rounded-xl border-collapse bg-[var(--surface-1,#ffffff)]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  className={headerCellClass}
                  key={String(col.key)}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ width: col.width }}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="ml-1 text-[var(--focus-ring,#0e7a53)]">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  className={`transition-colors duration-200 hover:bg-[var(--surface-2,#fcfaf5)] ${
                    onRowClick ? "cursor-pointer" : "cursor-default"
                  }`}
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td className={bodyCellClass} key={String(col.key)}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[var(--t3,#8b8378)]"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between border-t border-[var(--border-1,#e5dfd2)] pt-5">
          <span className="text-xs text-[var(--t3,#8b8378)]">
            Page {currentPage} of {totalPages} ({sortedData.length} total)
          </span>
          <div className="flex gap-2">
            <button
              className={paginationButtonClass}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className={paginationButtonClass}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
