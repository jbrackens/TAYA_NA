import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Form, Field } from "formik";
import { makeStyles } from "@material-ui/styles";
import Box from "@material-ui/core/Box";
import SelectField from "../formik-fields/SelectField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import MenuItem from "@material-ui/core/MenuItem";
import Markdown from "../formik-fields/MarkdownField";
import Checkbox from "../formik-fields/CheckboxField";
import { fetchRisks, getRisks } from "../../modules/settings/settingsSlice";

const useStyles = makeStyles({
  box: {
    "& > *": { marginTop: "16px" },
  },
});

const TriggerManualTaskForm = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const risks = useSelector(getRisks);

  useEffect(() => {
    dispatch(fetchRisks({ params: { manualTrigger: true } }));
  }, [dispatch]);

  return (
    <Box className={classes.box} component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="fraudKey" label="Risk Type" component={SelectField}>
        {risks.map(({ fraudKey, name }) => (
          <MenuItem key={fraudKey} value={fraudKey}>
            {name}
          </MenuItem>
        ))}
      </Field>
      <Field name="note" component={Markdown} />
      <Field name="checked" component={Checkbox} label="Mark task checked" />
    </Box>
  );
};

export default TriggerManualTaskForm;
