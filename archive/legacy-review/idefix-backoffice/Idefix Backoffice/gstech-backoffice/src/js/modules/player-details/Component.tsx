import React from "react";
import { makeStyles, Typography } from "@material-ui/core";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import { PlayerDetailsForm } from "../../forms/player-details";
import { FormikProps } from "formik";
import { PlayerWithUpdate } from "app/types";

const useStyles = makeStyles(theme => ({
  paper: {
    padding: theme.spacing(3),
  },
  actionsBlock: {
    display: "flex",
    justifyContent: "flex-end",

    "& > :last-child": {
      marginLeft: theme.spacing(1),
    },
  },
}));

interface Props {
  isEditing: boolean;
  isFetching: boolean;
  isSaving: boolean;
  countries: { id: string; name: string }[];
  languages: { id: string; name: string }[];
  onEdit: () => void;
  onCancel: (formikProps: FormikProps<PlayerWithUpdate>["resetForm"]) => void;
  formikProps: FormikProps<PlayerWithUpdate>;
}

export default ({ isEditing, isFetching, isSaving, countries, languages, onEdit, onCancel, formikProps }: Props) => {
  const classes = useStyles();

  return (
    <>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="subtitle2">Player Details</Typography>

        {!isEditing ? (
          <Button size="small" onClick={onEdit} disabled={isFetching}>
            Edit
          </Button>
        ) : (
          <Box className={classes.actionsBlock}>
            <Button onClick={() => onCancel(formikProps.resetForm)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              color="primary"
              type="submit"
              onClick={formikProps.submitForm}
              disabled={!formikProps.isValid || formikProps.isSubmitting || !formikProps.dirty}
            >
              Save
            </Button>
          </Box>
        )}
      </Box>

      <Box mt={3}>
        <PlayerDetailsForm countries={countries} languages={languages} isEditing={isEditing} {...formikProps} />
      </Box>
    </>
  );
};
