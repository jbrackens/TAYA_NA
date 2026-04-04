import React, { useCallback } from "react";
import Box from "@mui/material/Box";
import { styled } from "@mui/system";
import flatten from "lodash/fp/flatten";
import { useDropzone } from "react-dropzone";

import api from "@idefix-backoffice/idefix/api";

import { getSources } from "../helpers";

const StyledDropzone = styled("div")(() => ({
  height: 150,
  width: 250,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "#4054B2",
  border: "1px dashed #4054B2",
  borderRadius: "8px",
  cursor: "pointer"
}));

const DropzoneField = ({ onChange }: { onChange: (documents: any[]) => void }) => {
  const handleDrop = useCallback(
    (files: any) => {
      getSources(files)
        .then(response => {
          const files = flatten(response).map(source => source.file);
          return Promise.all(files.map(file => api.photos.uploadPhoto(file.source, file.name)));
        })
        .then(documents => {
          onChange(documents);
        });
    },
    [onChange]
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop: handleDrop, multiple: true });

  return (
    <Box mt={2}>
      <StyledDropzone {...getRootProps()}>
        <input {...getInputProps()} />
        Drop document here
      </StyledDropzone>
    </Box>
  );
};

export { DropzoneField };
