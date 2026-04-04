import React, { useEffect } from "react";
import { Field, Form, useFormikContext } from "formik";
import MenuItem from "@material-ui/core/MenuItem";
import Box from "@material-ui/core/Box";
import { Typography } from "@material-ui/core";
import TextField from "../formik-fields/TextField";
import SelectField from "../formik-fields/SelectField";
import Toggle from "../formik-fields/ToggleField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { normalizePercentage } from "../formik-fields/helpers";
import { GameManufacturer, GameProfile } from "app/types";
import { FormValues } from "../../dialogs/create-game/index";

const EditGame = ({
  manufacturers,
  gameProfiles,
}: {
  manufacturers: GameManufacturer[];
  gameProfiles: { brandId: string; brandName: string; availableProfiles: GameProfile[] }[];
}) => {
  const { setFieldValue, values } = useFormikContext<FormValues>();

  useEffect(() => {
    if (values.manufacturerId && values.manufacturerId === "RLX")
      setFieldValue("gameId", `${values.manufacturerId}_${values.manufacturerGameId}`);
  }, [values.manufacturerId, values.manufacturerGameId, setFieldValue]);

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
      <Field name="mobileGame" label="Mobile" component={Toggle} />
      <Field name="playForFun" label="Play for fun" component={Toggle} />
      <Field name="archived" label="Archived" component={Toggle} />
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

export default EditGame;
