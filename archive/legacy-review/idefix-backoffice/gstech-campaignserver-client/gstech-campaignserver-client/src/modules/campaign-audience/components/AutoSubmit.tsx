import { useCallback, useEffect } from "react";
import debounce from "lodash/debounce";
import { useFormikContext } from "formik";

import { useMounted } from "../../../hooks";

const AutoSubmit = () => {
  const { values, submitForm, isValid } = useFormikContext();
  const mounted = useMounted();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSubmitForm = useCallback(debounce(submitForm, 250), []);

  useEffect(() => {
    if (mounted && isValid) {
      debouncedSubmitForm();
    }

    // eslint-disable-next-line
  }, [isValid, values]);

  return null;
};

export default AutoSubmit;
