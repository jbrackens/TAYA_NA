import React, { useCallback, useMemo } from "react";
import flatten from "lodash/fp/flatten";
import find from "lodash/fp/find";
import { useDropzone } from "react-dropzone";
import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import NavigationClose from "@material-ui/icons/Close";
import Box from "@material-ui/core/Box";
import { getSources } from "../helpers";
import api from "../../../core/api";

import "../../style.css";
import { FieldProps } from "formik/dist/Field";

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

const Loading = () => (
  <Box position="absolute">
    <CircularProgress />
  </Box>
);

const AddKycDocuments = ({ field, form }: FieldProps) => {
  const classes = useStyles();
  const { name, value } = field;
  const { errors, setFieldValue } = form;
  const photos = useMemo(() => (value === undefined ? [] : value), [value]);
  const isLoading = find(["isLoading", true])(photos);

  const handleDrop = useCallback(
    files => {
      getSources(files, true)
        .then(response => {
          const previewPhotos = flatten(response).map(source => source.previewPhoto);
          const files = flatten(response).map(source => source.file);
          setFieldValue(name, [...photos, ...previewPhotos]);

          return Promise.all(files.map(file => api.photos.uploadPhoto(file.source, file.name)));
        })
        .then(newPhotos => setFieldValue(name, [...photos, ...newPhotos]))
        .catch(e => {
          setFieldValue(name, [...photos]);
        });
    },
    [name, photos, setFieldValue],
  );

  const handleRemovePhoto = useCallback(
    index => setFieldValue(name, [...photos.slice(0, index), ...photos.slice(index + 1)]),
    [name, photos, setFieldValue],
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
          ),
        )}
      {!isLoading && (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center">
          {errors[name] && (
            <Box component="span" fontSize={14} color="#f44336">
              {errors[name]}
            </Box>
          )}
          <div className={classes.fieldsDropzoneDropzone} {...getRootProps()}>
            <input {...getInputProps()} />
            Drop document here (Max 10Mb)
          </div>
        </Box>
      )}
    </Box>
  );
};

export default AddKycDocuments;
