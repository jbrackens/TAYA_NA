import React, { useState } from "react";
import { useDispatch } from "react-redux";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

import { dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  source: any;
  photoClassName: any;
}

const HoverImage = ({ source, photoClassName }: Props) => {
  const dispatch = useDispatch();
  const [hover, setHover] = useState(false);

  const mouseOver = () => setHover(true);
  const mouseOut = () => setHover(false);

  return (
    <Box position="relative" onMouseOver={mouseOver} onMouseOut={mouseOut}>
      <img
        src={source}
        className={photoClassName}
        style={{ opacity: hover ? 0.2 : 1, height: 150, marginRight: 5, border: "1px solid rgba(0, 0, 0, 0.6)" }}
        alt="document"
      />
      <IconButton
        onClick={() => dispatch(dialogsSlice.openDialog(DIALOG.FULL_SIZE_IMAGE, { source }))}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          visibility: hover ? "visible" : "hidden",
          cursor: "pointer"
        }}
      >
        <ZoomInIcon />
      </IconButton>
    </Box>
  );
};

export default HoverImage;
