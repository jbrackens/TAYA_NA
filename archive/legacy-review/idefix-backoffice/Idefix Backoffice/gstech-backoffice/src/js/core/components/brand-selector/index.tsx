import React, { FC } from "react";
import { useSelector } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import { getBrands } from "../../../modules/app";
import InputLabel from "@material-ui/core/InputLabel";

const useStyles = makeStyles(() => ({
  formControl: {
    minWidth: "80px",
    width: "100%",
  },
  select: {
    "& .MuiSelect-root:focus": {
      backgroundColor: "transparent",
    },
  },
  menuItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuIcon: {
    width: 16,
    height: 16,
    marginLeft: "8px",
  },
}));

interface Props {
  selectedBrand: string;
  onChange: (brandId: string) => void;
}

const BrandSelector: FC<Props> = ({ selectedBrand, onChange }) => {
  const classes = useStyles();
  const brands = useSelector(getBrands);

  return (
    <FormControl className={classes.formControl}>
      <InputLabel>Brand</InputLabel>
      <Select
        className={classes.select}
        value={selectedBrand || "all"}
        label="brand"
        onChange={e => onChange(e.target.value as string)}
      >
        <MenuItem value="all">All brands</MenuItem>
        {brands?.map(({ id: brandId, name }) => (
          <MenuItem key={brandId} value={brandId} className={classes.menuItem}>
            {name}
            <img src={`/images/logos/${brandId}@2x.png`} alt="brand" className={classes.menuIcon} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default BrandSelector;
