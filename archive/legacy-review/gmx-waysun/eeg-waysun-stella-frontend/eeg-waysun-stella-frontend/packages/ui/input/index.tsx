import { useEffect, useState, useRef, FC } from "react";
import {
  StyledInput,
  InputWrapper,
  InputLabel,
  InputError,
  InputFieldDiv,
  ClearInputButton,
  IconDiv,
  LoaderDiv,
} from "./index.styled";
import { LoaderInline } from "./..";
import { CloseOutlined } from "@ant-design/icons";

type InputProps = {
  onChange?: (e?: any) => void;
  onBlur?: (e: any) => void;
  onClick?: (e?: any) => void;
  onInputCleared?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  type?: string;
  labelText?: string;
  error?: any;
  value?: string | number;
  icon?: any;
  clearInput?: boolean;
  className?: string;
  noHints?: boolean;
  loading?: boolean;
  iconBackground?: boolean;
  iconClicked?: () => void;
};

export const Input: FC<InputProps> = ({
  id,
  name,
  onChange,
  disabled,
  fullWidth = false,
  placeholder,
  onBlur,
  onClick,
  type,
  labelText,
  error = "",
  value = "",
  icon,
  clearInput,
  onInputCleared,
  className,
  noHints,
  loading = false,
  iconBackground = false,
  iconClicked,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const changehandler = (e: any) => {
    setInputValue(e.target.value);
    onChange && onChange(e);
  };

  const clearInputHandler = () => {
    setInputValue("");
    onChange && onChange();
    onInputCleared && onInputCleared();
    inputRef.current.focus();
  };

  return (
    <InputWrapper>
      {labelText && <InputLabel htmlFor={name}>{labelText}</InputLabel>}
      <InputFieldDiv $fullWidth={fullWidth} className={className}>
        <StyledInput
          id={id}
          name={name}
          type={type}
          value={loading ? "" : inputValue}
          placeholder={loading ? "" : placeholder}
          onChange={changehandler}
          onClick={onClick}
          onBlur={onBlur}
          disabled={loading ? true : disabled}
          $fullWidth={fullWidth}
          $icon={icon && typeof icon !== "string"}
          $iconBackground={icon && typeof icon !== "string" && iconBackground}
          $clear={clearInput}
          ref={inputRef}
          autoComplete={noHints ? "off" : "on"}
        />
        {!loading &&
          !disabled &&
          clearInput &&
          inputValue.toString().length > 0 && (
            <ClearInputButton
              compact
              buttonType="nobackground"
              onClick={clearInputHandler}
              $icon={icon && typeof icon !== "string"}
              $iconBackground={
                icon && typeof icon !== "string" && iconBackground
              }
            >
              <CloseOutlined />
            </ClearInputButton>
          )}
        {icon && typeof icon !== "string" && (
          <IconDiv
            onClick={(e) => {
              inputRef.current.focus();
              if (iconClicked) {
                iconClicked();
              } else {
                !disabled && onClick && onClick(e);
              }
            }}
            $iconBackground={icon && typeof icon !== "string" && iconBackground}
          >
            {icon}
          </IconDiv>
        )}
        {loading && (
          <LoaderDiv>
            <LoaderInline />
          </LoaderDiv>
        )}
      </InputFieldDiv>
      <InputError $show={error.length > 0}>{error}</InputError>
    </InputWrapper>
  );
};

Input.defaultProps = {
  disabled: false,
  fullWidth: false,
};
