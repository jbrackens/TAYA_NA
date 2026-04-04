import { FC, useCallback, useState } from "react";
import capitalize from "lodash/fp/capitalize";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import FormGroup from "@mui/material/FormGroup";
import ExpandIcon from "@mui/icons-material/KeyboardArrowDownRounded";

import { EventType } from "@idefix-backoffice/idefix/types";

interface Props {
  filters: Record<EventType, boolean>;
  onFilterChange: (filter: EventType) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Filter: FC<Props> = ({ filters, onFilterChange }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  return (
    <Box>
      <Button onClick={handleOpen} endIcon={<ExpandIcon />}>
        Filter
      </Button>
      <Menu
        aria-labelledby="Filters menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
      >
        <Box p="8px 24px">
          <FormGroup>
            {Object.keys(filters).map(key => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={filters[key as EventType]}
                    onChange={onFilterChange(key as EventType)}
                    name={key}
                  />
                }
                label={capitalize(key)}
              />
            ))}
          </FormGroup>
        </Box>
      </Menu>
    </Box>
  );
};

export { Filter };
