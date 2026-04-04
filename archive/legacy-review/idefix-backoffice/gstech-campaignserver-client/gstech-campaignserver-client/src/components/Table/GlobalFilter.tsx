import * as React from "react";

import { Search } from "../Search";

interface IProps {
  globalFilter?: string;
  disabled?: boolean;
  className?: string;
  setGlobalFilter: (query: string) => void;
}

const GlobalFilter: React.FC<IProps> = ({ globalFilter, setGlobalFilter, disabled, className }) => (
  <Search
    className={className}
    value={globalFilter}
    onChange={e => setGlobalFilter(e.target.value)}
    disabled={disabled}
  />
);

export { GlobalFilter };
