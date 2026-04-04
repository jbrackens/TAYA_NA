import React from "react";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { FieldProps } from "formik/dist/Field";

interface Props extends FieldProps {
  buttons: { label: string; key: string }[];
  onClick: (key: string) => void;
}

const ButtonGroupField = ({ field, buttons, form, onClick }: Props) => {
  const { value, name } = field;
  const { errors, setFieldValue } = form;

  const handleClick = (key: string) => {
    if (onClick) {
      onClick(key);
    }

    setFieldValue(name, key);
  };

  return (
    <Box display="flex" flexDirection="column" marginBottom="16px">
      {errors[name] && (
        <Box component="span" fontSize={14} color="#f44336" marginBottom="16px">
          {errors[name]}
        </Box>
      )}
      <ButtonGroup>
        {buttons.map(({ label, key }) => (
          <Button disabled={value === key} onClick={() => handleClick(key)} key={key}>
            {label}
          </Button>
        ))}
      </ButtonGroup>
    </Box>
  );
};

export default ButtonGroupField;
