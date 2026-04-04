import { FC } from "react";
import Box from "@mui/material/Box";
import { Settings } from "../../modules/settings";

const SettingsPage: FC = () => {
  return (
    <Box p={3}>
      <Settings />
    </Box>
  );
};

export { SettingsPage };
