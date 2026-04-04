import React, { useCallback } from "react";
import { useDispatch } from "react-redux";

import { User } from "app/types";
import Box from "@material-ui/core/Box";
import api from "../../core/api";
import { UserDetailsForm } from "../../forms/user-details";
import { refetchUsers } from "../users-sidebar";
import { refetchUser } from "../user-info";

interface Props {
  user: User | null;
}

const Container = ({ user }: Props) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    async (values, formActions) => {
      try {
        if (user) {
          await api.users.update(user.id, {
            ...values,
            ...(values.mobilePhone ? { mobilePhone: values.mobilePhone.substring(1) } : {}),
          });
          dispatch(refetchUsers());
          dispatch(refetchUser(user.id));
        }
      } catch (error) {
        formActions.setFieldError("general", error.message);
      }
    },
    [dispatch, user],
  );

  return (
    <Box display="flex" width={1}>
      <UserDetailsForm user={user} onSubmit={handleSubmit} />
    </Box>
  );
};

export default Container;
