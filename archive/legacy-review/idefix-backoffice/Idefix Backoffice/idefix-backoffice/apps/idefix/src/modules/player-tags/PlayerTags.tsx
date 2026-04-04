import { FC } from "react";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { usePlayerTags } from "./hooks";
import { TAGS_OPTIONS } from "./constants";
import Chip from "@mui/material/Chip";

const PlayerTags: FC = () => {
  const { tags, isLoading, handleAdd, handleRemove } = usePlayerTags();

  return (
    <Box>
      <Typography variant="subtitle2">Tags</Typography>
      <Box mt={3}>
        <Autocomplete
          multiple
          fullWidth
          disableClearable
          filterSelectedOptions
          options={TAGS_OPTIONS}
          value={tags || []}
          disabled={isLoading}
          onChange={handleAdd}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} onDelete={() => handleRemove(option)} />
            ))
          }
          renderInput={params => <TextField {...params} placeholder={isLoading ? "Loading..." : "Search"} />}
        />
      </Box>
    </Box>
  );
};

export { PlayerTags };
