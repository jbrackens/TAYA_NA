import { FC } from "react";
import { StyledError } from "./index.styled";

type InputErrorProps = {
  text: string;
  isVisible: boolean;
};

export const InputError: FC<InputErrorProps> = ({ text, isVisible }) => {
  return <>{isVisible && <StyledError>{text}</StyledError>}</>;
};
