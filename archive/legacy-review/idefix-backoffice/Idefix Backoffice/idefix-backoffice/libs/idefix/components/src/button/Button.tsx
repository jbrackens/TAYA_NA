import React, { CSSProperties, FC, forwardRef, ReactElement, useCallback, useRef, useState } from "react";
import { CSVLink } from "react-csv";
import html2canvas from "html2canvas";
import FileSaver from "file-saver";
import Button, { ButtonProps } from "@mui/material/Button";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import ArrowIcon from "@mui/icons-material/KeyboardBackspaceRounded";
import { styled } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import { withStyles } from "@mui/styles";

import { formatDataByKeys } from "../table";

export interface DownloadCsvButtonProps {
  data?: any;
  fileName?: string;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  tooltipText?: string;
  headers: {
    key: string;
    label: string;
  }[];
  children?: ReactElement | string;
  enclosingCharacter?: string;
  separator?: string;
  uFEFF?: boolean;
  asyncOnClick?: boolean;
  onFetchData?: () => Promise<any>;
  keysToFormat?: { key: string; format: (value: any, row: any) => any }[];
}

export const BackButton = withStyles(theme => ({
  root: {
    border: 0,
    padding: 0,
    fontSize: 12,
    lineHeight: "16px",
    color: theme.colors.black9e,
    "&:hover": {
      background: "none",
      color: theme.colors.blue
    },
    "& svg": {
      marginRight: 16
    }
  }
}))(({ children, ...props }: ButtonProps) => (
  <Button disableRipple disableFocusRipple {...props}>
    <ArrowIcon />
    {children}
  </Button>
));

export const CircleIconButton = withStyles(theme => ({
  root: {
    width: 32,
    height: 32,
    padding: 0,
    borderWidth: 1,
    borderStyle: "solid",
    "&:hover": {
      color: theme.colors.blue
    }
  }
}))(({ children, ...rest }: IconButtonProps) => <IconButton {...rest}>{children}</IconButton>);

export const DownloadCsvButton: FC<DownloadCsvButtonProps> = forwardRef(
  ({ disabled, fileName, className, tooltipText = "", style, data, keysToFormat, ...rest }, ref) => {
    const [dataForExport, setDataForExport] = useState<any[]>([]);

    const handlePrepareData = useCallback(
      () => () => {
        if (keysToFormat) {
          const formattedData = formatDataByKeys(data, keysToFormat);
          setDataForExport(formattedData);
        }
      },
      [data, keysToFormat]
    );

    return (
      <CSVLink
        target="_blank"
        filename={fileName || "report.csv"}
        style={{
          textDecoration: "none",
          borderRadius: 17,
          pointerEvents: disabled ? "none" : "visible",
          ...style
        }}
        data={keysToFormat ? dataForExport : data}
        {...rest}
      >
        <Button disabled={disabled} className={className} onClick={keysToFormat ? handlePrepareData() : undefined}>
          download csv
        </Button>
      </CSVLink>
    );
  }
);

export const DownloadAllCsvButton: FC<DownloadCsvButtonProps> = ({
  disabled,
  fileName,
  className,
  tooltipText = "",
  onFetchData,
  ...rest
}) => {
  const [data, setData] = useState<unknown[]>([]);
  const [{ isLoading, loaded }, setLoading] = useState({ isLoading: false, loaded: false });
  const ref = useRef<any>(null);

  const handleClick = useCallback(async () => {
    if (onFetchData) {
      try {
        setLoading({ isLoading: true, loaded: false });

        const data = await onFetchData();

        setData(data);
        setLoading({ isLoading: false, loaded: true });

        ref.current.link.click();
      } catch (e) {
        setLoading({ isLoading: false, loaded: false });
      }
    }
  }, [onFetchData]);

  return (
    <>
      <Tooltip title={tooltipText}>
        <Button disabled={disabled || isLoading} className={className} onClick={handleClick}>
          Download csv
        </Button>
      </Tooltip>
      {!isLoading && loaded && (
        <CSVLink
          ref={ref}
          target="_blank"
          filename={fileName || "report.csv"}
          style={{
            textDecoration: "none",
            borderRadius: 17,
            pointerEvents: disabled ? "none" : "visible"
          }}
          data={data}
          {...rest}
        ></CSVLink>
      )}
    </>
  );
};

export const ScreenShotButton: FC = () => {
  const [isTakingScreenShot, setIsTakingScreenShot] = useState(false);

  const handleTakeScreenShot = useCallback(() => {
    setIsTakingScreenShot(true);
    html2canvas(document.body).then(canvas => {
      canvas.toBlob((blob: Blob | null) => {
        FileSaver.saveAs(blob as Blob, "full_page_screenshot.png");
        setIsTakingScreenShot(false);
      });
    });
  }, []);

  return (
    <Tooltip title="Take full page screenshot" placement="top" aria-label="take full page screenshot">
      <Button onClick={handleTakeScreenShot} disabled={isTakingScreenShot}>
        Screenshot
      </Button>
    </Tooltip>
  );
};
