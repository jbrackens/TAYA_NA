import React from "react";

interface Props {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index, ...rest }: Props) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
    {...rest}
  >
    {value === index && <>{children}</>}
  </div>
);
export default TabPanel;
