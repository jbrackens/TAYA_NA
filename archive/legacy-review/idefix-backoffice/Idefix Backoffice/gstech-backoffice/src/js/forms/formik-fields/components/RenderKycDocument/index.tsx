import React, { useState, useEffect } from "react";
import cn from "classnames";
import CircularProgress from "@material-ui/core/CircularProgress";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/styles";
import HoverImage from "./HoverImage";
import { getDocument } from "./actions";
import { getBase64FromPDF, getObjectUrlFromArrayBuffer, getValidContentType } from "../../../../core/helpers";
import { Typography } from "@material-ui/core";

const useStyles = makeStyles({
  photoContainer: {
    display: "flex",
    position: "relative",
  },
  photo: {
    marginRight: 5,
    border: "1px solid rgba(0, 0, 0, 0.6)",
  },
  photoHover: {
    opacity: 0.2,
  },
  photoFixedHeight: {
    height: 150,
  },
  link: {
    textDecoration: "underline",
    color: "blue",
    cursor: "pointer",
  },
  zoomIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    visibility: "hidden",
    cursor: "pointer",
  },
  zoomIconHover: {
    visibility: "visible",
  },
});

interface Props {
  id: string;
  fileName: string | undefined;
  photoContainerClassName?: string;
  photoClassName?: string;
  pdfPhotoClassName?: any;
}

const RenderKycDocument = ({
  id,
  fileName,
  photoContainerClassName = "",
  photoClassName = "",
  pdfPhotoClassName,
}: Props) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [source, setSource] = useState<any>(null);
  const [contentType, setContentType] = useState(null);
  const [href, setHref] = useState<Location | null>(null);
  const classes = useStyles();

  useEffect(() => {
    getDocument(id)
      .then(([contentType, arrayBuffer]) => {
        setContentType(contentType);

        if (contentType === "image/jpeg" || contentType === "image/png") {
          const imageURL = getObjectUrlFromArrayBuffer(arrayBuffer, contentType);

          return Promise.all([contentType, imageURL]);
        }

        if (contentType === "application/pdf") {
          return Promise.all([contentType, getBase64FromPDF(arrayBuffer, fileName)]);
        }

        const validContentType = getValidContentType(fileName, contentType);
        const objectUrl = getObjectUrlFromArrayBuffer(arrayBuffer, validContentType);

        return Promise.all([validContentType, objectUrl]);
      })
      .then(([contentType, source]) => {
        if (contentType === "application/pdf") {
          setIsLoaded(true);
          setSource(source.map((item: any) => item.file));
          return;
        }

        if (contentType === "image/jpeg" || contentType === "image/png") {
          setIsLoaded(true);
          setSource(source);
          return;
        }

        setIsLoaded(true);
        setSource(null);
        setHref(source);
      })
      .catch(err => {
        setIsLoaded(true);
        setSource(null);
      });
  }, [id, fileName]);

  const handleClick = () => {
    const otherWindow = window.open() as Window;
    otherWindow.opener = null;
    otherWindow.location = href as Location;
  };

  return (
    <Box
      className={cn(classes.photoContainer, {
        [photoContainerClassName]: contentType !== "image/jpeg" && contentType !== "image/png",
      })}
    >
      {isLoaded && (contentType === "image/jpeg" || contentType === "image/png") && (
        <HoverImage
          source={source}
          photoClassName={photoClassName}
          photo={classes.photo}
          photoFixedHeight={classes.photoFixedHeight}
          photoHover={classes.photoHover}
          zoomIcon={classes.zoomIcon}
          zoomIconHover={classes.zoomIconHover}
        />
      )}
      {isLoaded && contentType === "application/pdf" && source && (
        <Box display="flex" overflow="auto">
          {source?.map((file: any, index: number) => (
            <img
              key={`file.name-${index}`}
              src={file.base64}
              className={cn(classes.photo, classes.photoFixedHeight, { [pdfPhotoClassName]: !!pdfPhotoClassName })}
              alt="document"
            />
          ))}
        </Box>
      )}
      {isLoaded && !source && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography>Can't render document with this type</Typography>
          <Typography onClick={handleClick} className={classes.link}>
            {href}
          </Typography>
        </Box>
      )}
      {!isLoaded && (
        <Box>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default RenderKycDocument;
