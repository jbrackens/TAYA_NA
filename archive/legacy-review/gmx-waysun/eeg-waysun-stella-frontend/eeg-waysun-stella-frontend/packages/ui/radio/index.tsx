import React, { FC, useEffect, useState } from "react";
import {
  Container,
  RadioButton,
  Label,
  LoadingDiv,
  InputLabel,
  RadioError,
} from "./index.styled";
import { LoaderInline } from "./..";

export enum RadioTypeEnum {
  HORIZONTAL = "HORIZONTAL",
  VERTICAL = "VERTICAL",
}

export type RadioType = RadioTypeEnum.HORIZONTAL | RadioTypeEnum.VERTICAL;

type RadioProps = {
  type?: RadioType;
  value?: any;
  onChange?: any;
  name: string;
  options?: Array<{ name: string; value: string }>;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
};

export const Radio: FC<RadioProps> = ({
  type,
  value,
  onChange,
  name,
  options,
  label = "",
  disabled,
  loading = false,
  error = "",
}) => {
  const [checkedValue, setCheckedValue] = useState(value);

  useEffect(() => {
    setCheckedValue(value);
  }, [value]);

  const onRadioClick = (name: string, value: string) => {
    onChange && onChange(name, value);
    setCheckedValue(value);
  };

  return (
    <>
      {label.length > 0 && <Label>{label}</Label>}
      <Container layout={type} disabled={disabled}>
        {options?.map((radioEl) => (
          <RadioButton
            key={radioEl.name}
            selected={!loading && radioEl.value === checkedValue}
            onClick={() => onRadioClick(radioEl.name, radioEl.value)}
          >
            <input
              type="radio"
              id={radioEl.name}
              name={name}
              value={radioEl.value}
              checked={radioEl.value === checkedValue}
              onChange={() => onRadioClick(radioEl.name, radioEl.value)}
            />
            <InputLabel htmlFor={radioEl.name} $loading={loading}>
              {radioEl.name}
            </InputLabel>
            {loading && (
              <LoadingDiv>
                <LoaderInline />
              </LoadingDiv>
            )}
          </RadioButton>
        ))}
      </Container>
      <RadioError $show={error.length > 0}>{error}</RadioError>
    </>
  );
};
