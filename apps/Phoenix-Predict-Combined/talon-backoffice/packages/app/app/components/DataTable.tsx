"use client";

import React from "react";
import type { CSSProperties } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const columnWidthClasses: Record<string, string> = {
  "25%": "w-1/4",
  "33%": "w-1/3",
  "50%": "w-1/2",
  "64px": "w-16",
  "80px": "w-20",
  "96px": "w-24",
  "100px": "w-[100px]",
  "120px": "w-[120px]",
  "140px": "w-[140px]",
  "160px": "w-40",
  "180px": "w-[180px]",
  "200px": "w-[200px]",
  "220px": "w-[220px]",
  "240px": "w-60",
};

function getColumnWidthProps(width?: string): {
  className?: string;
  style?: CssVars;
} {
  if (!width) return {};
  if (columnWidthClasses[width]) {
    return { className: columnWidthClasses[width] };
  }
  return {
    className: "w-[var(--column-width)]",
    style: { "--column-width": width },
  };
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const tableClass = "w-full border-collapse bg-[#0f1225]";
  const theadClass = "border-b border-[#1a1f3a] bg-[#0f1225]";
  const thClass =
    "px-4 py-3 text-left text-xs font-bold uppercase tracking-normal text-[#D3D3D3]";
  const tdClass = "px-4 py-3 text-sm text-slate-300";
  const getTrClass = (index: number, interactive = false) =>
    [
      index % 2 === 0 ? "bg-[#0f1225]" : "bg-white/[0.02]",
      "border-b border-[#1a1f3a] transition-colors duration-200",
      interactive && "hover:bg-[rgba(43,228,128,0.08)]",
    ]
      .filter(Boolean)
      .join(" ");

  if (loading) {
    return (
      <table className={tableClass}>
        <thead className={theadClass}>
          <tr>
            {columns.map((col) => (
              <HeaderCell key={col.key} column={col} className={thClass} />
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(5)
            .fill(0)
            .map((_, rowIdx) => (
              <tr key={rowIdx} className={getTrClass(rowIdx)}>
                {columns.map((col) => (
                  <td key={col.key} className={tdClass}>
                    <div className="mb-2 h-4 rounded bg-[#1a1f3a]" />
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    );
  }

  if (data.length === 0) {
    return (
      <table className={tableClass}>
        <thead className={theadClass}>
          <tr>
            {columns.map((col) => (
              <HeaderCell key={col.key} column={col} className={thClass} />
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={columns.length}
              className="px-4 py-8 text-center text-sm text-slate-500"
            >
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className={tableClass}>
      <thead className={theadClass}>
        <tr>
          {columns.map((col) => (
            <HeaderCell key={col.key} column={col} className={thClass} />
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, rowIdx) => (
          <tr key={item.id || rowIdx} className={getTrClass(rowIdx, true)}>
            {columns.map((col) => (
              <td key={col.key} className={tdClass}>
                {col.render
                  ? col.render(item)
                  : (item[col.key as keyof T] as React.ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HeaderCell<T>({
  column,
  className,
}: {
  column: Column<T>;
  className: string;
}) {
  const widthProps = getColumnWidthProps(column.width);
  return (
    <th
      className={cx(className, widthProps.className)}
      style={widthProps.style}
    >
      {column.header}
    </th>
  );
}
