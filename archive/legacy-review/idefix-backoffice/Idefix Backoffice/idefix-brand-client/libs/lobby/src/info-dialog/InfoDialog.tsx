import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { getInfo, closeInfoDialog } from "./duck";
import { useRegistry } from "@brandserver-client/ui";
import { callSnackbar } from "@brandserver-client/utils";

const InfoDialog = () => {
  const { Snackbar } = useRegistry();
  const info = useSelector(getInfo);

  const dispatch = useDispatch();

  const handleCloseInfoDialog = React.useCallback(
    () => dispatch(closeInfoDialog()),
    [dispatch]
  );

  React.useEffect(() => {
    if (info) {
      window.dataLayer.push({
        event: "showInfo",
        info: {
          title: info.title,
          message: info.message
        }
      });
      callSnackbar(
        <Snackbar
          title={info.title}
          content={info.message}
          onCloseAction={handleCloseInfoDialog}
        />,
        {
          autoClose: true
        }
      );
    }
  }, [info]);

  return null;
};

export default InfoDialog;
