import { FC } from "react";
import {
  ToggleContainer,
  Togglelabel,
  ToggleSwitch,
  ToggleSwitchCheckbox,
  ToggleSwitchSwitch,
  ToggleSwitchInner,
  ToggleSwitchWrap,
} from "./index.styled";

type ToggleProps = {
  name?: string;
  checked?: boolean;
  onChange?: (name?: string, checked?: boolean) => void;
  disabled?: boolean;
  label?: string;
};

export const Toggle: FC<ToggleProps> = ({
  name,
  checked = false,
  onChange,
  disabled = false,
  label = "",
}) => {
  const handleClick = () => onChange && onChange(name, !checked);
  return (
    <ToggleContainer>
      {label.length > 0 && (
        <Togglelabel
          $checked={checked}
          $disabled={disabled}
          onClick={handleClick}
        >
          {label}
        </Togglelabel>
      )}
      <ToggleSwitch>
        <ToggleSwitchCheckbox
          type="checkbox"
          name={name}
          id={name}
          checked={checked}
          onChange={handleClick}
          disabled={disabled}
        />
        <ToggleSwitchWrap $disabled={disabled} onClick={handleClick}>
          <ToggleSwitchInner $checked={checked} />
          <ToggleSwitchSwitch $checked={checked} $disabled={disabled} />
        </ToggleSwitchWrap>
      </ToggleSwitch>
    </ToggleContainer>
  );
};

Toggle.defaultProps = {};
