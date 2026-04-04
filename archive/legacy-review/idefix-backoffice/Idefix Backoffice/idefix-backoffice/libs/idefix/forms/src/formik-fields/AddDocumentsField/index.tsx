import React, { FC, ReactNode, useCallback, useMemo } from "react";
import flatten from "lodash/fp/flatten";
import find from "lodash/fp/find";
import { useDropzone } from "react-dropzone";
import { FieldProps } from "formik";
import CircularProgress from "@mui/material/CircularProgress";
import NavigationClose from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

import api from "@idefix-backoffice/idefix/api";

import { getSources } from "../helpers";
import "./style.css";

const StyledDropZone = styled("div")(() => ({
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

const Loading = () => (
  <Box position="absolute">
    <CircularProgress />
  </Box>
);

const AddKycDocuments: FC<FieldProps<any>> = ({ field, form }) => {
  const { name, value } = field;
  const { errors, setFieldValue } = form;
  const photos = useMemo(() => (value === undefined ? [] : value), [value]);
  const isLoading = find(["isLoading", true])(photos);

  const handleDrop = useCallback(
    (files: any) => {
      getSources(files, true)
        .then(response => {
          const previewPhotos = flatten(response).map(source => source.previewPhoto);
          const files = flatten(response).map(source => source.file);
          setFieldValue(name, [...photos, ...previewPhotos]);

          return Promise.all(files.map(file => api.photos.uploadPhoto(file.source, file.name)));
        })
        .then(newPhotos => setFieldValue(name, [...photos, ...newPhotos]));
    },
    [name, photos, setFieldValue]
  );

  const handleRemovePhoto = useCallback(
    (index: number) => setFieldValue(name, [...photos.slice(0, index), ...photos.slice(index + 1)]),
    [name, photos, setFieldValue]
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop: handleDrop, multiple: true });

  return (
    <Box display="flex" alignItems="center" justifyContent="center">
      {photos &&
        photos.map((photo: any, index: number) =>
          photo.isLoading ? (
            <Box
              key={photo.id}
              className="fields-dropzone__photo-preview-container fields-dropzone__photo-container--fixed-height"
            >
              <Loading />
              <img
                className="fields-dropzone__photo fields-dropzone__photo--fixed-height fields-dropzone__photo--preview"
                src={photo.preview}
                alt="document"
              />
            </Box>
          ) : (
            <Box
              key={photo.id}
              className="fields-dropzone__photo-container fields-dropzone__photo-container--fixed-height"
            >
              <img
                className="fields-dropzone__photo fields-dropzone__photo--fixed-height"
                src={`/api/v1/photos/${photo.id}`}
                alt="document"
              />
              <Box className="fields-dropzone__remove">
                <NavigationClose className="fields-dropzone__remove-icon" onClick={() => handleRemovePhoto(index)} />
              </Box>
            </Box>
          )
        )}
      {!isLoading && (
        <Box>
          {errors[name] && (
            <Box component="span" fontSize={14} color="#f44336">
              {errors[name] as ReactNode}
            </Box>
          )}
          <StyledDropZone {...getRootProps()}>
            <input {...getInputProps()} />
            Drop document here
          </StyledDropZone>
        </Box>
      )}
    </Box>
  );
};

export { AddKycDocuments };
