import React, { useRef, useState } from "react";
import ReactCodeInput, { InputModeTypes } from "react-code-input";
import { Container } from "./index.styled";

type Props = {
  onChange: (value: string) => void;
  fields: number;
  name: string;
  inputMode: InputModeTypes;
  type: "number" | "tel" | "text" | "password" | undefined;
};

const CodeInput: React.FC<Props> = ({
  onChange,
  fields,
  name,
  inputMode,
  type,
}) => {
  const codeRef = useRef<ReactCodeInput>(null);
  const [wasValuePasted, setWasValuePasted] = useState(false);

  const onInputChange = (value: string) => {
    const idxOfElementToFocus =
      value.length < fields ? value.length : value.length - 1;
    if (wasValuePasted) {
      (codeRef.current as unknown as { textInput: HTMLInputElement[] }).textInput[idxOfElementToFocus].focus();
      setWasValuePasted(false);
    }
    onChange(value);
  };

  const handleOnPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === "INPUT";
    if (isInput) {
      setWasValuePasted(true);
      const ref = codeRef.current as unknown as { textInput: HTMLInputElement[]; state: { input: string[] } };
      ref.textInput[0].focus();
      Array.from(Array(fields)).forEach((_x, idx) => {
        ref.state.input[idx] = "";
      });
    }
  };

  return (
    <Container onPaste={handleOnPaste}>
      <ReactCodeInput
        name={name}
        inputMode={inputMode}
        type={type}
        fields={fields}
        onChange={onInputChange}
        className={Container.styledComponentId}
        ref={codeRef}
      />
    </Container>
  );
};

export { CodeInput };
