import { ChangeEvent, FC, MouseEvent, useCallback, useState } from "react";
import capitalize from "lodash/fp/capitalize";
import ExpandIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

interface Props {
  list: string[];
  filters: { [key: string]: boolean };
  onFilterChange: (key: string) => (event: ChangeEvent<HTMLInputElement>, value?: boolean) => void;
}

const DropdownFilter: FC<Props> = ({ list, filters, onFilterChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <Box>
      <Button onClick={handleClick} endIcon={<ExpandIcon />}>
        Filter
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "center",
          horizontal: "center"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
      >
        <Box p="22px 24px">
          <FormGroup>
            {list?.map(item => (
              <FormControlLabel
                key={item}
                control={<Checkbox color="primary" checked={filters[item]} onChange={onFilterChange(item)} />}
                label={capitalize(item)}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>
    </Box>
  );
};

export { DropdownFilter };
