'use client';

import styled from 'styled-components';
import { useState, useMemo } from 'react';

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: #16213e;

  th {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid #0f3460;
    font-weight: 600;
    font-size: 12px;
    color: #a0a0a0;
    text-transform: uppercase;
    background-color: #0f3460;
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: rgba(74, 126, 255, 0.1);
    }
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #0f3460;
    font-size: 14px;
    color: #ffffff;
  }

  tbody tr {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(74, 126, 255, 0.05);
    }
  }
`;

const NoDataRow = styled.tr`
  td {
    text-align: center;
    padding: 32px 12px;
    color: #a0a0a0;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #0f3460;
`;

const PaginationInfo = styled.span`
  font-size: 12px;
  color: #a0a0a0;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 8px;
`;

const SortIndicator = styled.span`
  margin-left: 4px;
  color: #4a7eff;
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: 6px 12px;
  background-color: #0f3460;
  color: #4a7eff;
  border: 1px solid #0f3460;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #16213e;
    border-color: #4a7eff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

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
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    let sorted = [...data];

    if (sortKey && columns.some((col) => col.key === sortKey && col.sortable)) {
      sorted.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
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
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div>
      <TableContainer>
        <StyledTable>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ width: col.width }}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <SortIndicator>{sortOrder === 'asc' ? '↑' : '↓'}</SortIndicator>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <NoDataRow>
                <td colSpan={columns.length}>{emptyMessage}</td>
              </NoDataRow>
            )}
          </tbody>
        </StyledTable>
      </TableContainer>

      {totalPages > 1 && (
        <PaginationContainer>
          <PaginationInfo>
            Page {currentPage} of {totalPages} ({sortedData.length} total)
          </PaginationInfo>
          <PaginationControls>
            <PaginationButton
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </PaginationButton>
            <PaginationButton
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </PaginationButton>
          </PaginationControls>
        </PaginationContainer>
      )}
    </div>
  );
}
