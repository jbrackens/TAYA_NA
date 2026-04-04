import React, { FC } from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  select: {
    minWidth: 130
  }
});

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
  keyField?: string;
}

const gameProfiles = ["Slots", "Table games", "Live", "Jackpot", "Limited wagering", "Sportsbetting"];

const GameProfileForm: FC<Props> = ({ values, onChangeValue, keyField = "gameProfile" }) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Game profile</InputLabel>
      <Select
        value={values[keyField] || ""}
        onChange={e => onChangeValue(keyField, e.target.value)}
        label="Game profile"
      >
        <MenuItem>All</MenuItem>
        {gameProfiles.map(gameProfile => (
          <MenuItem key={gameProfile} value={gameProfile}>
            {gameProfile}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export { GameProfileForm };
