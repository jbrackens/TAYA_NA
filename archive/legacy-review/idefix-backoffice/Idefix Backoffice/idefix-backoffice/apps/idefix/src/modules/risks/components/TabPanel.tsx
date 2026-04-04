import Box from "@mui/material/Box";
import React, { FC, ReactNode } from "react";

interface Props {
  children: ReactNode;
  value: number;
  index: number;
}

const TabPanel: FC<Props> = ({ children, value, index, ...rest }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
    {...rest}
  >
    {value === index && <Box>{children}</Box>}
  </Box>
);

export { TabPanel };
