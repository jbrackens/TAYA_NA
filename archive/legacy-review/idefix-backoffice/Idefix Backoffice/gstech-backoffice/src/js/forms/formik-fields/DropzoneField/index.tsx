import React, { useCallback } from "react";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/core/styles";
import flatten from "lodash/fp/flatten";
import { useDropzone } from "react-dropzone";
import { getSources } from "../helpers";
import api from "../../../core/api";

const useStyles = makeStyles(() => ({
  fieldsDropzoneDropzone: {
    height: 150,
    width: 250,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#4054B2",
    border: "1px dashed #4054B2",
    borderRadius: "8px",
    cursor: "pointer",
  },
}));

const DropzoneField = ({ onChange }: { onChange: (documents: any[]) => void }) => {
  const classes = useStyles();

  const handleDrop = useCallback(
    files => {
      getSources(files)
        .then(response => {
          const files = flatten(response).map(source => source.file);
          return Promise.all(files.map(file => api.photos.uploadPhoto(file.source, file.name)));
        })
        .then(documents => {
          onChange(documents);
        });
    },
    [onChange],
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop: handleDrop, multiple: true });

  return (
    <Box mt={2}>
      <div className={classes.fieldsDropzoneDropzone} {...getRootProps()}>
        <input {...getInputProps()} />
        Drop document here
      </div>
    </Box>
  );
};

export default DropzoneField;
