import { TextField } from "@mui/material";
import Box from "@mui/material/Box";
import { ChangeEvent, FC } from "react";

interface Props {
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const Search: FC<Props> = ({ onChange }) => {
  return (
    <Box>
      <TextField onChange={onChange} placeholder="Search user" fullWidth size="small" />
    </Box>
  );
};

export { Search };
