import * as React from "react";
import { useField } from "formik";

import { Tabs } from "../../components";

interface Props {
  name: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const TabsField: React.FC<Props> = ({ children, disabled, ...props }) => {
  const [field, { touched }, { setValue, setTouched }] = useField(props.name);

  const handleChange = React.useCallback(
    (newValue: string | number | string[] | boolean) => {
      if (!touched) {
        setTouched(true);
      }

      setValue(newValue);
    },
    [touched, setValue, setTouched]
  );

  return (
    <Tabs value={field.value} onChange={handleChange} disabled={disabled} {...props}>
      {children}
    </Tabs>
  );
};

export { TabsField };
