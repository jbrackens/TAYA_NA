import * as React from "react";

import { Search as SearchIcon } from "../../icons";
import { TextInput, TextInputProps } from "../";

interface Props extends TextInputProps {
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Search: React.FC<Props> = ({ value, onChange, ...rest }) => {
  return <TextInput icon={<SearchIcon />} placeholder="Search" value={value || ""} onChange={onChange} {...rest} />;
};

export { Search };
