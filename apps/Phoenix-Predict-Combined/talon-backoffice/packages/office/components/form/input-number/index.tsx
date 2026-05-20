import React from "react";
import type { InputNumberProps } from "antd";
import { InputNumberStyled } from "./index.styled";

const InputNumber = (props: InputNumberProps) => (
  <InputNumberStyled style={{ width: "100%" }} {...props} />
);

export default InputNumber;
