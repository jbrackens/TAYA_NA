import React, { ChangeEvent, FC, ReactElement } from "react";
import Box from "@material-ui/core/Box";
import Input from "@material-ui/core/Input";
import InputAdornment from "@material-ui/core/InputAdornment";
import SearchRounded from "@material-ui/icons/SearchRounded";

import { useSearchStyles } from "./styles";

interface Props {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  buttons?: ReactElement;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const Search: FC<Props> = ({ buttons, ...rest }) => {
  const classes = useSearchStyles();

  return (
    <Box className={classes.search}>
      <Input
        disableUnderline
        className={classes.searchInput}
        startAdornment={
          <InputAdornment position="start">
            <SearchRounded />
          </InputAdornment>
        }
        {...rest}
      />
      <Box className={classes.buttons}>{buttons}</Box>
    </Box>
  );
};

export { Search };
