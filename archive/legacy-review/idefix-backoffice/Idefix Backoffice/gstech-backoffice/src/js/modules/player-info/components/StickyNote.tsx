import React, { memo, useCallback, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/styles";
import Button from "@material-ui/core/Button";
import StickyNoteIcon from "../../../core/icons/StickyNote";
import { Box, Theme, Typography } from "@material-ui/core";
import Mde from "../../../core/components/mde";
import { marked } from "marked";

const useStyles = makeStyles((theme: Theme) => ({
  paper: {
    padding: theme.spacing(3),
  },
  actionsBlock: {
    display: "flex",
    justifyContent: "flex-end",

    "& > :last-child": {
      marginLeft: theme.spacing(1),
    },
  },

  containedBox: {
    display: "flex",

    "& > :last-child": {
      alignSelf: "flex-start",
    },
  },
}));

interface Props {
  stickyNote: string;
  isFetching: boolean;
  isSaving: boolean;
  onUpdateStickyNote: (content: string) => void;
}

const StickyNote = ({ stickyNote, isFetching, isSaving, onUpdateStickyNote }: Props) => {
  const classes = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(stickyNote ? stickyNote : "");

  useEffect(() => {
    setValue(stickyNote);
  }, [stickyNote]);

  const handleCancel = useCallback(() => {
    setValue(stickyNote ? stickyNote : "");
    setIsEditing(false);
  }, [stickyNote]);

  const handleEdit = useCallback(() => setIsEditing(true), []);

  const handleSave = useCallback(async () => {
    if (stickyNote !== value) {
      await onUpdateStickyNote(value);
    }
    setIsEditing(false);
  }, [onUpdateStickyNote, stickyNote, value]);

  if (!stickyNote && !isEditing) {
    return (
      <>
        <Typography variant="subtitle2">Notes</Typography>
        <Box mt={3}>
          <Button onClick={handleEdit} startIcon={<StickyNoteIcon />} disabled={isFetching}>
            {isFetching ? "Loading..." : "Add Note"}
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="subtitle2">Notes</Typography>

        {!isEditing && (
          <Button
            size="small"
            variant="outlined"
            style={{ borderRadius: 50 }}
            onClick={handleEdit}
            disabled={isFetching}
          >
            Edit
          </Button>
        )}

        {isEditing && (
          <>
            <Box className={classes.actionsBlock}>
              <Button onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button color="primary" onClick={handleSave} disabled={isSaving}>
                Save
              </Button>
            </Box>
          </>
        )}
      </Box>

      {isEditing ? (
        <Box mt={3}>
          <Mde value={value} onChange={setValue} />
        </Box>
      ) : (
        <Box className={classes.containedBox}>
          <Box width="90%" dangerouslySetInnerHTML={{ __html: marked(stickyNote) }} />
        </Box>
      )}
    </>
  );
};

export default memo(StickyNote);
