import styled from "styled-components";
import { Button } from "ui";
import { Form } from "formik";

export const SettingsContainer = styled.div`
  margin: 130px auto 30px;
  max-width: 800px;
  background-color: ${(props) => props.theme.settings.backgroundColor};
  border-radius: 10px;
  padding: 48px 0 100px;
  h3 {
    margin-top: 0;
    margin-bottom: 20px;
    text-align: center;
  }
`;

type SettingsContentProps = {
  $customWidth?: number;
};
export const SettingsContent = styled.div<SettingsContentProps>`
  padding: 40px 50px 0;
  ${(props) =>
    props.$customWidth && {
      "max-width": `${props.$customWidth}px`,
      margin: "0 auto",
    }}
`;

export const CustomButton = styled(Button)`
  margin-top: 20px;
`;

export const RightButton = styled(Button)`
  margin: 0 0 0 auto;
`;

export const CustomField = styled.div`
  margin-bottom: 20px;
`;

export const BoldDetails = styled.div`
  font-weight: 700;
`;

export const ColorDetails = styled.div`
  color: ${(props) => props.theme.settings.coloredInfo};
`;

export const CustomForm = styled(Form)`
  > div {
    margin-bottom: 15px;
  }
`;

export const ButtonDiv = styled.div`
  margin-top: 30px;
  display: flex;
`;
