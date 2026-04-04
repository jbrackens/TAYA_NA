import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { FC, useCallback, useMemo, useState } from "react";
import { Formik, FormikHelpers } from "formik";
import pick from "lodash/fp/pick";

import { User, UserDraft } from "@idefix-backoffice/idefix/types";
import { UserDetailsForm, userDetailsValidationSchema, UserDetailsFormValues } from "@idefix-backoffice/idefix/forms";
import { TooltipCard } from "@idefix-backoffice/shared/ui";
import { LoadingIndicator } from "@idefix-backoffice/idefix/components";

interface Props {
  isLoading: boolean;
  user: User | null;
  onSubmit: (values: Partial<UserDraft>) => Promise<void>;
}

const UserDetails: FC<Props> = ({ isLoading, user, onSubmit }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(
    (resetForm: FormikHelpers<UserDetailsFormValues>["resetForm"]) => () => {
      resetForm();
      setIsEditing(false);
    },
    []
  );

  const handleSubmit = useCallback(
    async (values: UserDetailsFormValues, formikHelpers: FormikHelpers<UserDetailsFormValues>) => {
      await onSubmit(values);
      setIsEditing(false);
    },
    [onSubmit]
  );

  const initialValues = useMemo(
    () =>
      user
        ? { ...pick(["name", "handle", "email", "mobilePhone"], user) }
        : {
            name: "",
            handle: "",
            mobilePhone: "",
            email: ""
          },
    [user]
  );

  const placeholders = useMemo(
    () => (
      <Box display="flex" flexWrap="wrap">
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center">
            <LoadingIndicator />
          </Box>
        ) : (
          <>
            <TooltipCard label="Name">{user?.name || "Empty"}</TooltipCard>
            <TooltipCard label="Handle">{user?.handle || "Empty"}</TooltipCard>
            <TooltipCard label="Email">{user?.email || "Empty"}</TooltipCard>
            <TooltipCard label="Mobile phone">{user?.mobilePhone || "Empty"}</TooltipCard>
          </>
        )}
      </Box>
    ),
    [isLoading, user]
  );

  return (
    <Box>
      <Typography variant="subtitle2">User Details</Typography>

      {isEditing ? (
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          enableReinitialize
          validationSchema={userDetailsValidationSchema}
        >
          {props => (
            <>
              <Box display="flex" justifyContent="flex-end">
                <Button onClick={handleCancel(props.resetForm)} disabled={props.isSubmitting}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  onClick={() => props.submitForm()}
                  disabled={!props.isValid || props.isSubmitting || !props.dirty}
                >
                  Save
                </Button>
              </Box>
              <UserDetailsForm />
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

export { UserDetails };
