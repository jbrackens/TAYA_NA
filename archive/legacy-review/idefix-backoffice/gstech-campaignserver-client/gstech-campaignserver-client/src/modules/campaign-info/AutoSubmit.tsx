import { useCallback, useEffect, memo } from "react";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import { useFormikContext } from "formik";

import { useMounted } from "../../hooks";
import { IFormValues } from "./types";

const AutoSubmit = () => {
  const { values, submitForm, isValid, initialValues } = useFormikContext<IFormValues>();
  const mounted = useMounted();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSubmitForm = useCallback(debounce(submitForm, 350), []);

  const isEqualWithInitialValues = isEqual(initialValues, values);

  useEffect(() => {
    if (mounted && isValid && !isEqualWithInitialValues) {
      debouncedSubmitForm();
    }
    // eslint-disable-next-line
  }, [isValid, values, isEqualWithInitialValues]);

  return null;
};

export default memo(AutoSubmit);
