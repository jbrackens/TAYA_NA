import { CSSProperties, ReactElement, ReactNode } from "react";
import { TableProps as MaterialTableProps } from "@mui/material/Table";
import { BoxProps } from "@mui/material/Box";
import { ButtonProps } from "@mui/material/Button";
import { CheckboxProps } from "@mui/material/Checkbox";
import { TypographyProps } from "@mui/material/Typography";
import { MenuItemProps } from "@mui/material/MenuItem";

export interface TableProps extends Omit<MaterialTableProps, "summary" | "onClick"> {
  initialData: any[];
  isLoading: boolean;
  children: ReactElement<ChildProps>[] | ReactNode[];
  displayRows?: number;
  estimatedItemSize?: number;
  onLoadMore?: (pageSize: number) => void;
}

// TODO cleanup unused types
export type ChildProps = (
  | ColumnProps
  | CheckboxColumnProps
  | HTMLColumnProps
  | LinkColumnProps
  | ButtonColumnProps
  | MultipleColumnProps
  | DropdownColumnProps
) &
  BaseColumnProps;

export type GeneratedRowProps = ChildProps &
  MultipleColumnProps &
  DropdownColumnProps &
  ButtonColumnProps &
  LinkColumnProps;

export type SortDirection = "asc" | "desc";
export type ColumnType = "text" | "date" | "boolean" | "custom";

export interface BaseColumnProps {
  align?: "left" | "right";
  value?: string | number;
  row?: any;
  label: string;
  name: string;
  format?: (value: any, row?: any) => ReactNode;
  comparedName?: string;
  style?: CSSProperties;
  className?: string;
}

export interface ColumnProps extends BaseColumnProps, Omit<TypographyProps, "align"> {
  type: ColumnType;
}

export type CheckboxColumnProps = BaseColumnProps & CheckboxProps;

export type HTMLColumnProps = BaseColumnProps & BoxProps;

export interface LinkColumnProps extends BaseColumnProps {
  href: string;
  linkName?: string;
  linkValue?: string | number;
}

export interface ButtonColumnProps extends Omit<ButtonProps, "onClick">, Pick<BaseColumnProps, "label" | "align"> {
  isAdmin?: boolean;
  manager?: string;
  onClick?: (item: any) => void;
}

export interface MultipleColumnProps extends BaseColumnProps, BoxProps {
  urlName?: string;
  urlValue?: string | number;
  secondName?: string;
  secondValue?: string | number;
}

export interface DropdownColumnProps extends BaseColumnProps {
  children: ReactElement<MenuItemProps> | ReactElement<MenuItemProps>[];
}
