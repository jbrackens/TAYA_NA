import React, { FC } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";

const useStyles = makeStyles(theme => ({
  formControl: {
    padding: theme.spacing(2),
    margin: 0,
  },
}));

interface Props {
  filters: {
    inactive: boolean;
  };
  onFilterToggle: (key: string, value: boolean) => void;
}

const SidebarTools: FC<Props> = ({ filters, onFilterToggle }) => {
  const classes = useStyles();

  return (
    <Box>
      <Box ml={3}>
        <FormControlLabel
          className={classes.formControl}
          onChange={(e, v) => onFilterToggle("inactive", v)}
          control={<Checkbox checked={filters.inactive} color="primary" />}
          label="Show closed accounts"
          labelPlacement="end"
        />
      </Box>
    </Box>
  );
};

export default SidebarTools;
