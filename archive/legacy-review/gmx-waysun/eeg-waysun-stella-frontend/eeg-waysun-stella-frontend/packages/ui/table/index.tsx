import { FC } from "react";
import {
  TableContainer,
  TableHeaderContainer,
  TableBodyContainer,
  TableRowContainer,
  TableColContainer,
} from "./index.styled";
import { LoaderInline } from "./..";

type TableProps = {
  stripped?: boolean;
};

type TableColProps = {
  colSpan?: number;
  width?: number;
  align?: "left" | "right" | "center";
  loading?: boolean;
};

export const Table: FC<TableProps> = ({ children, stripped = false }) => (
  <TableContainer cellSpacing={0} cellPadding={0} stripped={stripped}>
    {children}
  </TableContainer>
);

export const TableHeader: FC = ({ children }) => (
  <TableHeaderContainer>{children}</TableHeaderContainer>
);

export const TableBody: FC = ({ children }) => (
  <TableBodyContainer>{children}</TableBodyContainer>
);

export const TableRow: FC = ({ children }) => (
  <TableRowContainer>{children}</TableRowContainer>
);

export const TableCol: FC<TableColProps> = ({
  children,
  width,
  align = "left",
  loading = false,
  colSpan,
}) => (
  <TableColContainer widthPercentage={width} align={align} colSpan={colSpan}>
    {loading ? <LoaderInline /> : children}
  </TableColContainer>
);
