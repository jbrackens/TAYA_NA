import { CSSProperties, ReactElement, ReactNode } from "react";
import { TableProps as MaterialTableProps } from "@material-ui/core/Table";
import { WithStyles } from "@material-ui/core/styles";
import { BoxProps } from "@material-ui/core/Box";
import { ButtonProps } from "@material-ui/core/Button";
import { CheckboxProps } from "@material-ui/core/Checkbox";
import { TypographyProps } from "@material-ui/core/Typography";
import { MenuItemProps } from "@material-ui/core/MenuItem";

export interface TableProps extends Omit<MaterialTableProps, "summary" | "onClick"> {
  initialData: any[];
  isLoading: boolean;
  children: ReactElement<ChildProps>[] | ReactNode[];
  displayRows?: number;
  estimatedItemSize?: number;
  onLoadMore?: (pageSize: number, sortKey?: string, sortDirection?: SortDirection) => void;
  onSort?: (sortKey: string, sortDirection: SortDirection) => void;
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

export interface LinkColumnProps extends BaseColumnProps, WithStyles<any> {
  href: string;
  linkName?: string;
  linkValue?: string | number;
}

export interface ButtonColumnProps extends Omit<ButtonProps, "onClick">, Pick<BaseColumnProps, "label" | "align"> {
  isAdmin?: boolean;
  manager?: string;
  onClick?: (item: any) => void;
}

export interface MultipleColumnProps extends BaseColumnProps, BoxProps, WithStyles<any> {
  urlName?: string;
  urlValue?: string | number;
  secondName?: string;
  secondValue?: string | number;
}

export interface DropdownColumnProps extends BaseColumnProps {
  children: ReactElement<MenuItemProps> | ReactElement<MenuItemProps>[];
}
