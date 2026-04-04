import React, { FC } from "react";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";

import { Settings } from "@idefix-backoffice/idefix/types";
import { styles } from "./styles";

interface Props {
  brands: Settings["brands"];
  selectedBrand: string | undefined;
  onChange: (brandId: string) => void;
}

const BrandSelector: FC<Props> = ({ brands, selectedBrand, onChange }) => {
  return (
    <FormControl sx={styles.formControl}>
      <InputLabel>Brand</InputLabel>
      <Select
        sx={styles.select}
        value={selectedBrand || "all"}
        label="brand"
        onChange={e => onChange(e.target.value as string)}
      >
        <MenuItem value="all">All brands</MenuItem>
        {brands?.map(({ id: brandId, name }) => (
          <MenuItem key={brandId} value={brandId} sx={styles.menuItem}>
            {name}
            <img src={`../../assets/brands/${brandId}.png`} alt="brand" style={styles.menuIcon} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export { BrandSelector };
