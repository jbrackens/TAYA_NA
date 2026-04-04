import React from "react";
import { InputNumberProps } from "antd/lib/input-number";
import { InputNumberStyled } from "./index.styled";

const InputNumber = (props: InputNumberProps) => (
  <InputNumberStyled style={{ width: "100%" }} {...props} />
);

export default InputNumber;
