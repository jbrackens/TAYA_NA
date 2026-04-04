import Box from "@mui/material/Box";
import { FC, ReactNode } from "react";
import { CircularProgressbarWithChildren as Progressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useTheme } from "@mui/material";

interface Props {
  value: number;
  children?: ReactNode;
  circleRatio?: number;
}

const CircularProgressbar: FC<Props> = ({ value, children, ...rest }) => {
  const { palette } = useTheme();
  return (
    <Box position="relative">
      <Progressbar
        value={value}
        text={`${Math.round(value)}%`}
        {...rest}
        styles={buildStyles({
          rotation: 7 / 10,
          strokeLinecap: "round",
          textColor: palette.text.primary,
          textSize: "20px",
          trailColor: "rgba(255,152,0, 0.08)",
          pathColor: "rgba(255,152,0)"
        })}
      >
        {children}
      </Progressbar>
    </Box>
  );
};

export { CircularProgressbar };
