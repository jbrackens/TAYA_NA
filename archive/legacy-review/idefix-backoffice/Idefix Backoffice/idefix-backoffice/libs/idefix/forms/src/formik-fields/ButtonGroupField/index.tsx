import React, { ReactNode } from "react";
import { FieldProps } from "formik";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

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
          {errors[name] as ReactNode}
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

export { ButtonGroupField };
