import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { FC, SyntheticEvent } from "react";

interface Props {
  filters: {
    inactive: boolean;
  };
  onToggleFilter: (key: string) => (event: SyntheticEvent<Element, Event>, checked: boolean) => void;
}

const Filter: FC<Props> = ({ filters, onToggleFilter }) => {
  return (
    <Box>
      <FormControlLabel
        onChange={onToggleFilter("inactive")}
        control={<Checkbox checked={filters.inactive} color="primary" />}
        label="Show closed accounts"
        labelPlacement="end"
      />
    </Box>
  );
};

export { Filter };
