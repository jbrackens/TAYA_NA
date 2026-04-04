import debounce from "lodash/debounce";
import { AppDispatch } from "../../../index";

const debounceAction = (action: any, wait: number, options?: any) => {
  const debounced = debounce(
    (dispatch: AppDispatch, actionArgs: any[]) => dispatch(action(...actionArgs)),
    wait,
    options,
  );

  const thunk = (...actionArgs: any[]) => (dispatch: AppDispatch) => debounced(dispatch, actionArgs);

  thunk.cancel = debounced.cancel;
  thunk.flush = debounced.flush;

  return thunk;
};

export default debounceAction;
