import { FC } from "react";
import React from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Box from "@mui/material/Box";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import CropIcon from "@mui/icons-material/Crop";
import FillIcon from "@mui/icons-material/FormatColorFill";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import LoupeIcon from "@mui/icons-material/Loupe";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";

import { useEditableImage } from "./hooks";

interface Props {
  src: string;
  documentId: number;
  photoId: string;
  onEditImage: (prevPhotoId: string, blob: any, documentId: number) => void;
}

const EditableImage: FC<Props> = ({ src, documentId, photoId, onEditImage }) => {
  const {
    magnifyingGlassStatus,
    crop,
    sources,
    sourceIndex,
    handleCrop,
    handleDrawBox,
    handleCompleteCrop,
    handleRotateImage,
    handleStepSource,
    handleCancelEdit,
    handleChangeMagnifyingGlassStatus,
    handleSubmit
  } = useEditableImage({ src, documentId, photoId, onEditImage });
  const cropAreaSelected = crop != null && crop.width > 0 && crop.height > 0;

  return sources.length ? (
    <Box display="flex" flexDirection="column" alignItems="flex-start">
      <Box display="flex" alignItems="center">
        <IconButton onClick={handleCrop} disabled={!cropAreaSelected}>
          <CropIcon />
        </IconButton>
        <IconButton onClick={handleDrawBox} disabled={!cropAreaSelected}>
          <FillIcon />
        </IconButton>
        <IconButton onClick={handleRotateImage}>
          <RotateRightIcon />
        </IconButton>
        <IconButton
          onClick={handleChangeMagnifyingGlassStatus}
          style={{ backgroundColor: magnifyingGlassStatus ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0)" }}
        >
          <LoupeIcon />
        </IconButton>
        <IconButton onClick={() => handleStepSource("undo")} disabled={sourceIndex === 0}>
          <UndoIcon />
        </IconButton>
        <IconButton onClick={() => handleStepSource("redo")} disabled={sourceIndex === sources.length - 1}>
          <RedoIcon />
        </IconButton>
        <Button onClick={handleCancelEdit} disabled={sources.length === 1}>
          Cancel
        </Button>
        <Box ml={1}>
          <Button onClick={handleSubmit} disabled={sources.length === 1}>
            Submit
          </Button>
        </Box>
      </Box>
      <Box display="flex" mt={2}>
        <Box sx={{ border: "1px solid rgba(0,0,0,0.4)" }}>
          <ReactCrop crop={crop} onChange={handleCompleteCrop}>
            <img src={sources[sourceIndex].src} alt="" />
          </ReactCrop>
        </Box>
        <Box
          sx={{
            display: magnifyingGlassStatus ? "block" : "none",
            overflow: "auto",
            marginLeft: 16,
            maxWidth: "300px"
          }}
        >
          <canvas id={String(documentId)} />
        </Box>
      </Box>
    </Box>
  ) : null;
};

export { EditableImage };
