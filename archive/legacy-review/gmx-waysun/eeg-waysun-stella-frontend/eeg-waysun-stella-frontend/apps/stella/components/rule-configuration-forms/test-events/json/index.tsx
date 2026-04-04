import React, { FC, useEffect, useState } from "react";
import { JsonContainer, ButtonSection, ContentSection } from "./index.styled";
import { Link } from "ui";
import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";
import { useTranslation } from "next-export-i18n";

type JsonComponentProps = {
  display: boolean;
  variableToDisplay: Object;
};

const JsonComponent: FC<JsonComponentProps> = ({
  display = false,
  variableToDisplay,
}) => {
  const { t } = useTranslation();
  return (
    <JsonContainer $display={display}>
      <ContentSection>
        <pre>{JSON.stringify(variableToDisplay, null, 3)}</pre>
      </ContentSection>
    </JsonContainer>
  );
};

export default JsonComponent;
