import { useCallback, useEffect } from "react";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import { useFormikContext } from "formik";

import { useMounted } from "../../../hooks";

const AutoSubmit = () => {
  const { values, submitForm, isValid, initialValues } = useFormikContext();
  const mounted = useMounted();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSubmitForm = useCallback(debounce(submitForm, 250), []);

  const isEqualWithInitialValues = isEqual(values, initialValues);

  useEffect(() => {
    if (mounted && isValid && !isEqualWithInitialValues) {
      debouncedSubmitForm();
    }
  }, [isValid, debouncedSubmitForm, values, mounted, isEqualWithInitialValues]);

  return null;
};

export default AutoSubmit;
