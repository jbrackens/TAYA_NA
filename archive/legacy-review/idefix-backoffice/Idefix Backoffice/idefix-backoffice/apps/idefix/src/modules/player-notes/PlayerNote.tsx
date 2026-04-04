import { FC } from "react";
import { marked } from "marked";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

import { Mde } from "@idefix-backoffice/idefix/components";

import { usePlayerNote } from "./hooks";

const PlayerNote: FC = () => {
  const { playerStickyNote, isLoading, isEditing, handleEdit, content, handleChange, handleSave } = usePlayerNote();

  return (
    <Box>
      <Typography variant="subtitle2">Notes</Typography>
      {isEditing && (
        <Box>
          <Stack direction="row-reverse">
            <Button onClick={handleEdit} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              Save
            </Button>
          </Stack>
          <Box mt={2}>
            <Mde value={content} onChange={handleChange} />
          </Box>
        </Box>
      )}
      {!isEditing && (
        <Box>
          <Stack direction="row-reverse">
            <Button onClick={handleEdit} disabled={isLoading}>
              Edit
            </Button>
          </Stack>
          <Box dangerouslySetInnerHTML={{ __html: marked(playerStickyNote ?? "") }} />
        </Box>
      )}
    </Box>
  );
};

export { PlayerNote };
