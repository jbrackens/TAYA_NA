import React, { useCallback, useMemo, useState } from "react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { validationSchema } from "./index";
import { User } from "app/types";
import pick from "lodash/fp/pick";
import Typography from "@material-ui/core/Typography";
import TooltipCard from "../../core/components/tooltip-card/ToolTipCard";

interface FormValues {
  name: string;
  handle: string;
  mobilePhone: string;
  email: string;
}

interface UserDetailsFormProps {
  onSubmit: (values: any, formActions: any) => Promise<void>;
  user: User | null;
}

function UserDetailsForm({ onSubmit, user }: UserDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false);

  const placeholders = useMemo(
    () => (
      <Box display="flex" flexWrap="wrap">
        <TooltipCard label="Name">{user?.name || "Empty"}</TooltipCard>
        <TooltipCard label="Handle">{user?.handle || "Empty"}</TooltipCard>
        <TooltipCard label="Email">{user?.email || "Empty"}</TooltipCard>
        <TooltipCard label="Mobile phone">{user?.mobilePhone || "Empty"}</TooltipCard>
      </Box>
    ),
    [user],
  );

  const handleEdit = useCallback(() => setIsEditing(true), []);

  const handleCancel = useCallback(
    (resetForm: FormikHelpers<any>["resetForm"]) => () => {
      resetForm();
      setIsEditing(false);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (values: FormValues, formActions: FormikHelpers<FormValues>) => {
      await onSubmit(values, formActions);
      setIsEditing(false);
    },
    [onSubmit],
  );

  const initialValues = useMemo(
    () =>
      user
        ? { ...pick(["name", "handle", "email", "mobilePhone"], user) }
        : {
            name: "",
            handle: "",
            mobilePhone: "",
            email: "",
          },
    [user],
  );

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize={true}
      validationSchema={validationSchema}
    >
      {props => (
        <Box component={Form} width={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="subtitle2">User Details</Typography>

            {!isEditing ? (
              <Button size="small" onClick={handleEdit}>
                Edit
              </Button>
            ) : (
              <Box display="flex">
                <Button onClick={handleCancel(props.resetForm)} disabled={props.isSubmitting}>
                  Cancel
                </Button>
                <Box ml={1}>
                  <Button
                    color="primary"
                    type="submit"
                    onClick={props.submitForm}
                    disabled={!props.isValid || props.isSubmitting || !props.dirty}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {isEditing ? (
            <Box display="flex" flexDirection="column">
              <Field component={ErrorMessageField} />
              <Box display="flex">
                <Box>
                  <Field name="name" component={TextField} label="Name" disabled={!isEditing} />
                </Box>
                <Box marginLeft={2}>
                  <Field name="handle" component={TextField} label="Handle" disabled={!isEditing} />
                </Box>
                <Box marginLeft={2}>
                  <Field name="email" component={TextField} label="Email" disabled={!isEditing} />
                </Box>
                <Box marginLeft={2}>
                  <Field name="mobilePhone" component={TextField} label="Mobile phone" disabled={!isEditing} />
                </Box>
              </Box>
            </Box>
          ) : (
            placeholders
          )}
        </Box>
      )}
    </Formik>
  );
}

export default UserDetailsForm;
