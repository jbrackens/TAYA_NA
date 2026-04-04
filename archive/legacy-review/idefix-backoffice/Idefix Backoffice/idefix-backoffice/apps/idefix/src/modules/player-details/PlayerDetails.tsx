import { FC, useMemo } from "react";
import { Formik } from "formik";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

import { PlayerDetailsForm, playerDetailsFormValidationSchema } from "@idefix-backoffice/idefix/forms";
import { TooltipCard } from "@idefix-backoffice/shared/ui";

import { usePlayerDetails, PROPERTIES } from "./hooks";
import { getValue } from "./utils";

const PlayerDetails: FC = () => {
  const { initialValues, handleSubmit, isEditing, handleEdit, countries, languages } = usePlayerDetails();

  const placeholders = useMemo(() => {
    return (
      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="8px 24px">
        {Object.entries(initialValues).map(([key, value]) => (
          <TooltipCard key={key} label={PROPERTIES[key]}>
            {getValue(value) || "Empty"}
          </TooltipCard>
        ))}
      </Box>
    );
  }, [initialValues]);

  return (
    <Box>
      <Typography variant="subtitle2">Player Details</Typography>

      {isEditing ? (
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={playerDetailsFormValidationSchema}
          enableReinitialize
        >
          {formikProps => (
            <>
              <Box display="flex" justifyContent="flex-end">
                <Button onClick={handleEdit} disabled={formikProps.isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={() => formikProps.submitForm()}
                  disabled={formikProps.isSubmitting || !formikProps.isValid || !formikProps.dirty}
                  sx={{ marginLeft: 1 }}
                >
                  Save
                </Button>
              </Box>

              <PlayerDetailsForm {...formikProps} countries={countries} languages={languages} />
            </>
          )}
        </Formik>
      ) : (
        <>
          <Box display="flex" justifyContent="flex-end">
            <Button onClick={handleEdit}>Edit</Button>
          </Box>
          {placeholders}
        </>
      )}
    </Box>
  );
};

export { PlayerDetails };
