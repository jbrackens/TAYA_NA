import React, { memo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import MaterialToolbar from "@material-ui/core/Toolbar";
import Tooltip from "@material-ui/core/Tooltip";
import Checkbox from "@material-ui/core/Checkbox";
import BrandSelector from "../../../../core/components/brand-selector";

const useStyles = makeStyles(theme => ({
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 4,
    marginLeft: 8,
    boxShadow: theme.shadows[0],
  },
}));

interface Props {
  selectedBrand?: string;
  filters: { closed: boolean };
  onToggleFilter: (filter: string) => void;
  onSelectBrand: () => void;
}

const Toolbar = ({ selectedBrand, filters, onToggleFilter, onSelectBrand }: Props) => {
  const classes = useStyles();

  return (
    <MaterialToolbar disableGutters className={classes.toolbar}>
      <Box flexGrow={1} marginRight={1}>
        <BrandSelector onChange={onSelectBrand} selectedBrand={selectedBrand as string} />
      </Box>

      <Box mr={1}>
        <Tooltip title="Show closed accounts">
          <Checkbox size="medium" checked={filters.closed} onClick={() => onToggleFilter("closed")} />
        </Tooltip>
      </Box>
    </MaterialToolbar>
  );
};

export default memo(Toolbar);
