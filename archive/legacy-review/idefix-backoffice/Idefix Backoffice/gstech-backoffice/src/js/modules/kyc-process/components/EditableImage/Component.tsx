import React from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Box from "@material-ui/core/Box";
import RotateRightIcon from "@material-ui/icons/RotateRight";
import CropIcon from "@material-ui/icons/Crop";
import FillIcon from "@material-ui/icons/FormatColorFill";
import UndoIcon from "@material-ui/icons/Undo";
import RedoIcon from "@material-ui/icons/Redo";
import LoupeIcon from "@material-ui/icons/Loupe";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  magnifyingGlassContainer: {
    overflow: "auto",
  },
  cropContainer: {
    border: "1px solid rgba(0,0,0,0.4)",
  },
}));

export default ({
  handleCrop,
  handleDrawBox,
  handleRotateImage,
  handleStepSource,
  handleCancelEdit,
  handleCompleteCrop,
  handleSubmit,
  handleChangeMagnifyingGlassStatus,
  crop,
  sourceIndex,
  sources,
  documentId,
  magnifyingGlassStatus,
}: any) => {
  const cropAreaSelected = crop != null && crop.width > 0 && crop.height > 0;
  const classes = useStyles();

  return (
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
        <Box className={classes.cropContainer}>
          <ReactCrop crop={crop} onChange={handleCompleteCrop}>
            <img src={sources[sourceIndex].src} alt="" />
          </ReactCrop>
        </Box>
        <Box
          display={magnifyingGlassStatus ? "block" : "none"}
          ml={2}
          maxWidth="300px"
          className={classes.magnifyingGlassContainer}
        >
          <canvas id={documentId} />
        </Box>
      </Box>
    </Box>
  );
};
