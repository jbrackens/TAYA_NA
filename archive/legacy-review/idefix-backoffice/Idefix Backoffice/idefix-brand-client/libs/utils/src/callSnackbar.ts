import { toast } from "react-toastify";

interface Params {
  autoClose?: boolean;
  closeOnClick?: boolean;
}

export const callSnackbar = (component: JSX.Element, params: Params = {}) => {
  toast(component, {
    hideProgressBar: true,
    closeButton: false,
    autoClose: params.autoClose ? 4000 : false,
    className: "snackbar-wrapper",
    bodyClassName: "snackbar-body",
    closeOnClick: params.closeOnClick || false,
    draggable: false
  });
};
