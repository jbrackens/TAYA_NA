import React, { useState } from 'react';
import styled from 'styled-components';

const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.base.fontSize};
`;

const TableHead = styled.thead`
  background-color: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const TableHeader = styled.th<{ $sortable?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  transition: background-color ${({ theme }) => theme.motion.fast};

  &:hover {
    background-color: ${({ theme, $sortable }) =>
      $sortable ? theme.colors.card : 'transparent'};
  }
`;

const TableBody = styled.tbody``;

interface StyledTableRowProps {
  $striped?: boolean;
  $index: number;
}

const TableRow = styled.tr<StyledTableRowProps>`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme, $striped, $index }) =>
    $striped && $index % 2 === 1 ? theme.colors.surface : 'transparent'};
  transition: background-color ${({ theme }) => theme.motion.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.card};
  }
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

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
    <TableContainer>
      <StyledTable>
        <TableHead>
          <TableRow $index={0}>
            {columns.map((column) => (
              <TableHeader
                key={String(column.key)}
                $sortable={column.sortable}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                {column.label}
                {column.sortable && sortConfig?.key === column.key && (
                  <span style={{ marginLeft: '8px' }}>
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex} $striped={striped} $index={rowIndex}>
              {columns.map((column) => (
                <TableCell key={String(column.key)}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
}

export default Table;
