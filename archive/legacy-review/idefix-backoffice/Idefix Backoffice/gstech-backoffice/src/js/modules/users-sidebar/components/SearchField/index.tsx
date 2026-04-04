import React, { ChangeEvent, memo } from "react";
import TextField from "@material-ui/core/TextField";
import Box from "@material-ui/core/Box";

const Search = ({ text, onChange }: { text?: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) => {
  return (
    <Box display="flex" alignItems="center" p="16px">
      <TextField
        value={text}
        placeholder="Search player"
        fullWidth
        onChange={onChange}
        style={{ backgroundColor: "#fff" }}
        onFocus={e => e.target.select()}
      />
    </Box>
  );
};

export default memo(Search);
