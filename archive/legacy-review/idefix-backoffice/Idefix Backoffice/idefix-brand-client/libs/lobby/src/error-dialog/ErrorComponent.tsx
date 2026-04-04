import * as React from "react";
import { ApiError } from "@brandserver-client/api";
import { useRegistry } from "@brandserver-client/ui";
import { pushRoute } from "@brandserver-client/utils";
import {
  useMessages,
  useErrorMessage,
  useLockBodyScroll
} from "@brandserver-client/hooks";

interface Props {
  error: ApiError;
  redirectUrl?: string;
  closeErrorDialog: () => void;
}

const ErrorComponent: React.FC<Props> = ({
  error,
  redirectUrl,
  closeErrorDialog
}) => {
  useLockBodyScroll(true);
  const { SnackbarModal } = useRegistry();

  const messages = useMessages({
    errorHeader: "error.popup-heading",
    email: "login.email",
    continue: "button.continue"
  });

  const defaultMessage = useErrorMessage(error.statusCode);

  const handleClose = () => {
    closeErrorDialog();

    if (redirectUrl) {
      pushRoute(redirectUrl);
    }
  };

  return (
    <SnackbarModal
      title={messages.errorHeader}
      content={error.message || defaultMessage}
      close={{ closeTitle: messages.continue, onClose: handleClose }}
    />
  );
};

export default ErrorComponent;
