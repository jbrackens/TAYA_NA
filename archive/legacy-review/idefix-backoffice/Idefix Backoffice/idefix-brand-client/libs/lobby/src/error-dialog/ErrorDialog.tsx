import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { closeErrorDialog, getError } from "./duck";
import ErrorComponent from "./ErrorComponent";

interface Props {
  redirectUrl?: string;
}

const ErrorDialog = ({ redirectUrl }: Props) => {
  const error = useSelector(getError);
  const dispatch = useDispatch();

  const handleCloseErrorDialog = React.useCallback(
    () => dispatch(closeErrorDialog()),
    [dispatch]
  );

  React.useEffect(() => {
    if (error) {
      window.dataLayer.push({
        event: "showErrorDialog",
        message: error.message || String(error.statusCode)
      });
    }
  }, [error]);

  if (!error) {
    return null;
  }

  return (
    <ErrorComponent
      error={error}
      closeErrorDialog={handleCloseErrorDialog}
      redirectUrl={redirectUrl}
    />
  );
};

export default ErrorDialog;
