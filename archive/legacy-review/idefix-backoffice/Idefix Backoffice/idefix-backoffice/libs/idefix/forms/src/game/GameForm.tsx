import React from "react";
import { Field, Form } from "formik";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { GameManufacturer, GameProfile } from "@idefix-backoffice/idefix/types";

import { TextField } from "../formik-fields/TextField";
import { SelectField } from "../formik-fields/SelectField";
import { ToggleField } from "../formik-fields/ToggleField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { normalizePercentage } from "../formik-fields/helpers";

const GameForm = ({
  manufacturers,
  gameProfiles
}: {
  manufacturers: GameManufacturer[];
  gameProfiles: { brandId: string; brandName: string; availableProfiles: GameProfile[] }[];
}) => {
  return (
    <Box component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="permalink" label="Permalink" component={TextField} />
      <Field name="gameId" label="Game ID" component={TextField} />
      <Field name="name" label="Name" component={TextField} />
      <Field name="manufacturerId" label="Manufacturer" component={SelectField}>
        {manufacturers &&
          manufacturers.map(({ id, name }) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
      </Field>
      <Field name="manufacturerGameId" label="Manufacturer ID" component={TextField} />
      <Field name="rtp" label="RTP%" component={TextField} onChange={normalizePercentage} />
      <Field name="mobileGame" label="Mobile" component={ToggleField} />
      <Field name="playForFun" label="Play for fun" component={ToggleField} />
      <Field name="archived" label="Archived" component={ToggleField} />
      <Box display="flex" flexDirection="column" mt={3}>
        <Typography>Brand Profiles</Typography>
        <Box>
          {gameProfiles.map(({ brandId, brandName, availableProfiles }, index) => (
            <Box key={brandId} display="flex">
              <Box minWidth={420}>
                <Field name={`profiles[${index}]`} component={SelectField} fullWidth label={brandName}>
                  {availableProfiles &&
                    availableProfiles.map(({ id, name }) => (
                      <MenuItem key={id} value={id}>
                        {name}
                      </MenuItem>
                    ))}
                </Field>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export { GameForm };
