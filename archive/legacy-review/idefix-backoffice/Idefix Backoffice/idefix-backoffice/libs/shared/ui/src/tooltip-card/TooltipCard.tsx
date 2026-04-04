import React, { FC, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import cn from "classnames";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

// const useCardStyles = makeStyles((theme: any) =>
//   createStyles({
//     card: {
//       background: "transparent",
//       boxShadow: "none",
//       display: "flex",
//       marginLeft: -1
//     },
//     mobileCard: {
//       [theme.breakpoints.between("xs", "sm")]: {
//         width: "100%"
//       }
//     },
//     cardAreaVisible: {
//       background: theme.colors.blackf5,
//       "& svg": {
//         color: theme.colors.blue
//       },
//       "& $divider": {
//         background: "none"
//       }
//     },
//     hoverEffect: {
//       "&:hover svg": {
//         color: theme.colors.blue
//       },
//       "&:hover $divider": {
//         background: "none"
//       }
//     },
//     label: {
//       textTransform: "capitalize",
//       fontSize: 12,
//       lineHeight: "16px",
//       color: theme.colors.black75
//     },
//     text: {
//       fontSize: 14,
//       lineHeight: "24px",
//       overflow: "hidden",
//       whiteSpace: "nowrap",
//       textOverflow: "ellipsis"
//     },
//     divider: {
//       width: 1,
//       height: "calc(100% - 32px)",
//       alignSelf: "center",
//       background: theme.colors.black0
//     }
//   })
// );

const StyledCard = styled(Card)(({ theme }) => ({
  background: "transparent",
  boxShadow: "none",
  display: "flex",
  flexGrow: 1,
  marginLeft: -1,
  [theme.breakpoints.between("xs", "sm")]: {
    width: "100%"
  },
  "&:hover svg": {
    color: theme.palette.primary
  },
  "&:hover $divider": {
    background: "none"
  }
}));

const StyledDivider = styled(Box)(({ theme }) => ({
  width: 1,
  height: "calc(100% - 32px)",
  alignSelf: "center",
  background: "#ccc"
}));

const TOOLTIP_TEXT = "Click to copy";

interface Props {
  label: string;
  className?: string;
  children: string | number;
}

const TooltipCard: FC<Props> = ({ label, className, children }) => {
  const [tooltip, setTooltip] = useState<string>(TOOLTIP_TEXT);

  return (
    <CopyToClipboard text={String(children)} onCopy={() => setTooltip("Copied")}>
      <Tooltip title={tooltip} placement="bottom-start" onClose={() => setTooltip(TOOLTIP_TEXT)}>
        <StyledCard>
          <StyledDivider />
          <CardActionArea
          // classes={{
          //   focusVisible: classes.cardAreaVisible
          // }}
          >
            <CardContent>
              <Typography variant="subtitle1" component="span">
                {label}
              </Typography>
              <Typography component="div">{children}</Typography>
            </CardContent>
          </CardActionArea>
        </StyledCard>
      </Tooltip>
    </CopyToClipboard>
  );
};

export { TooltipCard };
