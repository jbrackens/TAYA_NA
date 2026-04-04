import { useEffect, useState, FC } from "react";
import {
  StyledTextarea,
  TextareaWrapper,
  TextareaLabel,
  TextareaError,
  LoaderDiv,
  TextAreaFieldDiv,
} from "./index.styled";
import { LoaderInline } from "./..";

type TextAreaProps = {
  onChange?: (e: any) => void;
  onBlur?: () => void;
  disabled?: boolean;
  fullWidth?: boolean | undefined;
  placeholder?: string;
  id?: string;
  name?: string;
  labelText?: string;
  error?: string;
  rows?: number;
  value?: string | undefined;
  loading?: boolean;
};

export const TextArea: FC<TextAreaProps> = ({
  id,
  name,
  onChange,
  disabled,
  fullWidth,
  placeholder,
  onBlur,
  labelText,
  error = "",
  rows = 5,
  value,
  loading = false,
}) => {
  const [textareaValue, setTextareaValue] = useState(value);

  useEffect(() => {
    setTextareaValue(value);
  }, [value]);

  const changehandler = (e: any) => {
    setTextareaValue(e.target.value);
    onChange && onChange(e);
  };

  return (
    <TextareaWrapper>
      {labelText && <TextareaLabel htmlFor={name}>{labelText}</TextareaLabel>}
      <TextAreaFieldDiv $fullWidth={fullWidth}>
        <StyledTextarea
          id={id}
          name={name}
          $fullWidth={fullWidth}
          placeholder={loading ? "" : placeholder}
          value={loading ? "" : textareaValue}
          onChange={changehandler}
          onBlur={onBlur}
          rows={rows}
          disabled={loading ? true : disabled}
        />
        {loading && (
          <LoaderDiv>
            <LoaderInline />
          </LoaderDiv>
        )}
      </TextAreaFieldDiv>
      <TextareaError $show={error.length > 0}>{error}</TextareaError>
    </TextareaWrapper>
  );
};

TextArea.defaultProps = {
  disabled: false,
  fullWidth: false,
};
