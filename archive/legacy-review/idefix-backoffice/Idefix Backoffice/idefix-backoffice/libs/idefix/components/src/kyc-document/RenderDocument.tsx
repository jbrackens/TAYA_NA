import { FC } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

import { Kyc } from "@idefix-backoffice/idefix/types";

import { useRenderDocument } from "./hooks";

const StyledImage = styled("img")({
  height: 172,
  border: "1px solid #ccc",
  ":hover": {
    cursor: "zoom-in"
  }
});

interface Props {
  document: Kyc;
}

const RenderDocument: FC<Props> = ({ document }) => {
  const { isLoading, data, href, contentType, handleOpenFullSize } = useRenderDocument(document);

  const image = !isLoading && contentType && ["image/jpeg", "image/png"].includes(contentType) && (
    <StyledImage src={data as string} alt="image" onClick={handleOpenFullSize(data)} />
  );

  const pdf = !isLoading && contentType === "application/pdf" && (
    <Box display="flex" overflow="auto">
      {Array.isArray(data) &&
        data.map((file, idx) => (
          <StyledImage
            key={`${file.name}-${idx}`}
            src={file.base64}
            alt="document"
            onClick={handleOpenFullSize(file)}
          />
        ))}
    </Box>
  );

  const hrefLink = !isLoading && !data && href && (
    <Box>
      <Typography>Can't render document</Typography>
      <a href={href} target="_blank" rel="noreferrer">
        {href}
      </a>
    </Box>
  );

  return (
    <Box>
      <Typography>File Name: {document.name}</Typography>
      {image}
      {pdf}
      {hrefLink}
    </Box>
  );
};

export { RenderDocument };
