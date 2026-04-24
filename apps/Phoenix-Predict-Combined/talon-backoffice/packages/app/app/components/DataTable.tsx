"use client";

import React from "react";

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

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#0f1225",
  };

  const theadStyle: React.CSSProperties = {
    backgroundColor: "#0f1225",
    borderBottom: "1px solid #1a1f3a",
  };

  const thStyle: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "700",
    color: "#D3D3D3",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const tbodyStyle: React.CSSProperties = {};

  const getTrStyle = (index: number): React.CSSProperties => {
    return {
      backgroundColor:
        index % 2 === 0 ? "#0f1225" : "rgba(255, 255, 255, 0.02)",
      borderBottom: "1px solid #1a1f3a",
      transition: "background-color 0.2s",
    };
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: "14px",
    color: "#cbd5e1",
  };

  const emptyStyle: React.CSSProperties = {
    padding: "32px 16px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
  };

  const skeletonLineStyle: React.CSSProperties = {
    height: "16px",
    backgroundColor: "#1a1f3a",
    borderRadius: "4px",
    marginBottom: "8px",
  };

  if (loading) {
    return (
      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ ...thStyle, width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={tbodyStyle}>
          {Array(5)
            .fill(0)
            .map((_, rowIdx) => (
              <tr key={rowIdx} style={getTrStyle(rowIdx)}>
                {columns.map((col) => (
                  <td key={col.key} style={tdStyle}>
                    <div style={skeletonLineStyle} />
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
      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ ...thStyle, width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} style={emptyStyle}>
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table style={tableStyle}>
      <thead style={theadStyle}>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={{ ...thStyle, width: col.width }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody style={tbodyStyle}>
        {data.map((item, rowIdx) => (
          <tr
            key={item.id || rowIdx}
            style={getTrStyle(rowIdx)}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLTableRowElement;
              el.style.backgroundColor = "rgba(43, 228, 128, 0.08)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLTableRowElement;
              el.style.backgroundColor =
                rowIdx % 2 === 0 ? "#0f1225" : "rgba(255, 255, 255, 0.02)";
            }}
          >
            {columns.map((col) => (
              <td key={col.key} style={tdStyle}>
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
