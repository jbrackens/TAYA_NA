import React, { useState } from "react";
import { useDispatch } from "react-redux";
import cn from "classnames";
import ZoomInIcon from "@material-ui/icons/ZoomIn";
import Box from "@material-ui/core/Box";
import { openDialog } from "../../../../dialogs/";

interface Props {
  source: any;
  photo: string;
  photoFixedHeight: string;
  photoHover: string;
  photoClassName: string;
  zoomIcon: string;
  zoomIconHover: string;
}

const HoverImage = ({
  source,
  photo,
  photoFixedHeight,
  photoHover,
  photoClassName,
  zoomIcon,
  zoomIconHover,
}: Props) => {
  const dispatch = useDispatch();
  const [hover, setHover] = useState(false);

  const mouseOver = () => setHover(true);
  const mouseOut = () => setHover(false);

  return (
    <Box position="relative" onMouseOver={mouseOver} onMouseOut={mouseOut}>
      <img
        src={source}
        className={cn({
          [photo]: !!photo,
          [photoHover]: hover,
          [photoFixedHeight]: !!photoFixedHeight,
          [photoClassName]: !!photoClassName,
        })}
        alt="document"
      />
      <ZoomInIcon
        className={cn({ [zoomIcon]: !!zoomIcon, [zoomIconHover]: hover })}
        onClick={() => dispatch(openDialog("full-size-image", { source }))}
      />
    </Box>
  );
};

export default HoverImage;
