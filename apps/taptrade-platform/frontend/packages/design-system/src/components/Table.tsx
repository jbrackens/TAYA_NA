import React, { useState } from 'react';
import { cx } from '../utils/classNames';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  striped?: boolean;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  striped = true,
  onSort,
  pagination,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: keyof T) => {
    const direction =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#3d3d5c]">
      <table className="w-full border-collapse text-[14px] leading-[20px]">
        <thead className="border-b border-[#3d3d5c] bg-[#2d2d44]">
          <tr className="border-b border-[#3d3d5c] transition-colors duration-200 ease-in-out hover:bg-[#4a4a5e]">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cx(
                  'select-none p-4 text-left font-semibold text-white transition-colors duration-200 ease-in-out',
                  column.sortable
                    ? 'cursor-pointer hover:bg-[#4a4a5e]'
                    : 'cursor-default'
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                {column.label}
                {column.sortable && sortConfig?.key === column.key && (
                  <span className="ml-2">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cx(
                'border-b border-[#3d3d5c] transition-colors duration-200 ease-in-out hover:bg-[#4a4a5e]',
                striped && rowIndex % 2 === 1 ? 'bg-[#2d2d44]' : 'bg-transparent'
              )}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className="p-4 text-white">
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
