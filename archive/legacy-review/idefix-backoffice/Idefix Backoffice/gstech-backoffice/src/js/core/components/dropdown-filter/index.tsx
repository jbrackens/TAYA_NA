import React, { useCallback, useState } from "react";
import capitalize from "lodash/fp/capitalize";
import Box from "@material-ui/core/Box";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import ExpandIcon from "@material-ui/icons/KeyboardArrowDownRounded";

import Checkbox from "@material-ui/core/Checkbox";
import Popover from "@material-ui/core/Popover";
import Button from "@material-ui/core/Button";

interface Props {
  label?: string;
  list: string[];
  filters: { [key: string]: boolean };
  onFilterCheck: (filter: string | any) => (event: React.ChangeEvent<HTMLInputElement>, value?: boolean) => void;
}

const DropdownFilter = ({ label, list, filters, onFilterCheck }: Props) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = useCallback(event => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <Box>
      <Button onClick={handleClick} endIcon={<ExpandIcon />}>
        {label ?? "Filter"}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "center",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Box p="22px 24px">
          <FormGroup>
            {list?.map(item => (
              <FormControlLabel
                key={item}
                control={<Checkbox color="primary" checked={filters[item]} onChange={onFilterCheck(item)} />}
                label={capitalize(item)}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>
    </Box>
  );
};

export default DropdownFilter;
