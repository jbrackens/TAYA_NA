import React from "react";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  select: {
    minWidth: 130,
  },
}));

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
  keyField?: string;
}

const gameProfiles = ["Slots", "Table games", "Live", "Jackpot", "Limited wagering", "Sportsbetting"];

export default ({ values, onChangeValue, keyField = "gameProfile" }: Props) => {
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
