import {
  LoginResponse,
  ResetPasswordResponse,
  LoginRestriction
} from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { CloseIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import Router from "next/router";
import * as React from "react";
import Restriction from "../components/Restriction";
import ResetPasswordForm from "./Form";
import { StyledResetPassword } from "./styled";
import {
  changeForgotOpen,
  selectIsForgotOpen,
  yup
} from "@brandserver-client/lobby";
import { useSelector, useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import { regexes } from "@brandserver-client/utils";

interface Props {
  phoneMask: string;
  email: string;
  language: string;
  restriction: LoginRestriction;
  forgotPasswordActive?: boolean;
  onForgotPassword: (
    email: string,
    retry?: boolean
  ) => Promise<ResetPasswordResponse>;
  onRemoveSelfExclusion: (exclusionKey: string) => void;
  onLoginResponse: (response: LoginResponse) => void;
  onResetPasswordLogin: (
    password: string,
    pin: string
  ) => Promise<LoginResponse>;
}

export interface FormValues {
  pinCode: string;
  showResetPassword: boolean;
  password: string;
}

const INITIAL_VALUES: FormValues = {
  pinCode: "",
  showResetPassword: false,
  password: ""
};

export const ResetPassword: React.FC<Props> = ({
  forgotPasswordActive,
  language,
  restriction,
  phoneMask,
  email,
  onLoginResponse,
  onForgotPassword,
  onRemoveSelfExclusion,
  onResetPasswordLogin
}) => {
  const { Modal } = useRegistry();
  const dispatch = useDispatch();
  const isForgotOpen = useSelector(selectIsForgotOpen);

  const handleClose = React.useCallback(() => {
    if (isForgotOpen) {
      return dispatch(changeForgotOpen(false));
    }

    Router.push(`/?lang=${language}`, `/${language}`);
  }, [isForgotOpen, language, dispatch]);

  const messages = useMessages({
    pinCode: "password-reset.pincode-placeholder",
    password: "login.password"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      showResetPassword: yup.boolean(),
      password: yup.string().when("showResetPassword", {
        is: true,
        then: yup
          .string()
          .required()
          .min(8)
          .matches(regexes.PASSWORD)
          .label(messages.password)
      }),
      pinCode: yup
        .string()
        .required("error.invalid-pincode")
        .length(6, "error.invalid-pincode")
        .label(messages.pinCode)
    });
  }, [messages]);

  const handleSubmit = React.useCallback(
    async (
      values: FormValues,
      { setSubmitting, setFieldValue, setFieldError }: FormikHelpers<FormValues>
    ) => {
      const { password, pinCode } = values;

      try {
        const response = await onResetPasswordLogin(password, pinCode);

        const { ok, result } = response;

        if (ok !== undefined && !ok && result) {
          setFieldValue("showResetPassword", false);
          setFieldValue("pinCode", "");
          return setFieldError("pinCode", result);
        }

        onLoginResponse(response);
      } catch (err) {
        console.log(err, "err");
      } finally {
        setSubmitting(false);
      }
    },
    [onResetPasswordLogin]
  );

  return (
    <StyledResetPassword>
      {(forgotPasswordActive || isForgotOpen) && (
        <Modal onClose={handleClose}>
          <>
            {!restriction.restrictionActive && (
              <Formik
                initialValues={INITIAL_VALUES}
                onSubmit={handleSubmit}
                validationSchema={validationSchema}
              >
                <ResetPasswordForm
                  email={email}
                  phoneMask={phoneMask}
                  onLoginResponse={onLoginResponse}
                  onForgotPassword={onForgotPassword}
                  onResetPasswordLogin={onResetPasswordLogin}
                  onCloseModal={handleClose}
                />
              </Formik>
            )}
            {restriction.restrictionActive && (
              <Restriction
                restriction={restriction}
                language={language}
                onRemoveSelfExclusion={onRemoveSelfExclusion}
              />
            )}
            <span className="close-btn d--md--none" onClick={handleClose}>
              <CloseIcon />
            </span>
          </>
        </Modal>
      )}
    </StyledResetPassword>
  );
};
