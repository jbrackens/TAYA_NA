import { FC, useEffect, useState } from "react";
import {
  Label,
  Input,
  Checkmark,
  Tick,
  Container,
  LoaderDiv,
} from "./index.styled";
import { LoaderInline } from "./..";

type CheckboxProps = {
  name?: string;
  onChange?: any;
  checked?: boolean;
  fullWidth?: boolean;
  label: any;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
};

export const Checkbox: FC<CheckboxProps> = ({
  checked = false,
  onChange,
  name,
  fullWidth = false,
  label,
  className,
  disabled,
  loading = false,
}) => {
  const [checkbox, setCheckbox] = useState(checked);

  useEffect(() => {
    setCheckbox(checked);
  }, [checked]);

  const handleCheckboxSelect = () => {
    onChange && onChange(name, !checkbox);
    setCheckbox(!checkbox);
  };

  return (
    <Container className={className} disabled={disabled}>
      <Label
        className="container"
        onClick={handleCheckboxSelect}
        checked={checkbox}
        fullWidth={fullWidth}
      >
        {label}
        <Input
          name={name}
          type="checkbox"
          checked={checkbox}
          onChange={handleCheckboxSelect}
          $loading={loading}
        />
        <Checkmark className="checkmark" checked={checkbox} $loading={loading}>
          <Tick checked={checkbox} />
        </Checkmark>
        {loading && (
          <LoaderDiv>
            <LoaderInline />
          </LoaderDiv>
        )}
      </Label>
    </Container>
  );
};
