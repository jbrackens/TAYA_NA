import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { CreateUserFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { createUser } from "./actions";

const useCreateUser = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (values: CreateUserFormValues, formikActions: FormikHelpers<CreateUserFormValues>) => {
      const user = await dispatch(createUser(values, formikActions));
      if (user?.id) {
        navigate(`/users/${user.id}`);
      }
    },
    [dispatch, navigate]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CREATE_USER)), [dispatch]);

  const initialValues = useMemo(
    () => ({
      name: "",
      handle: "",
      email: "",
      mobilePhone: ""
    }),
    []
  );

  return { handleSubmit, handleClose, initialValues };
};

export { useCreateUser };
