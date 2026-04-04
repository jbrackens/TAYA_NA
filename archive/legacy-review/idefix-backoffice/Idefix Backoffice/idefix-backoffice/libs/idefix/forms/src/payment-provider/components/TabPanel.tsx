import Box from "@mui/material/Box";
import { ReactNode } from "react";

interface TabPanelProps {
  children: ReactNode;
  value: string | number;
  index: string | number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
    {...other}
  >
    {value === index && <Box mt={2}>{children}</Box>}
  </div>
);

export { TabPanel };
