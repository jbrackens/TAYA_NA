import { DebounceSettingsLeading } from "lodash";
import debounce from "lodash/debounce";

function debounceAction<T extends (...args: any) => any>(
  func: T,
  wait: number | undefined,
  options?: DebounceSettingsLeading
) {
  const debounced = debounce((dispatch: any, actionArgs: any[]) => dispatch(func(...actionArgs)), wait, options);

  const thunk =
    (...actionArgs: any[]) =>
    (dispatch: any) =>
      debounced(dispatch, actionArgs);

  thunk.cancel = debounced.cancel;
  thunk.flush = debounced.flush;

  return thunk;
}

export default debounceAction;
