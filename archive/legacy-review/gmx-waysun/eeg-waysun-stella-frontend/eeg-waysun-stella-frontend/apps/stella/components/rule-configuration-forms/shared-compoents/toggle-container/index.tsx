import { useTranslation } from "next-export-i18n";
import React, { FC } from "react";
import { Toggle } from "ui";
import { ToggleContainer } from "./index.styled";

type ToggleContainerProps = {
  isActive: boolean;
  onChangeFunc: (name: string, value: boolean) => void;
};

export const ToggleContainerComponent: FC<ToggleContainerProps> = ({
  isActive,
  onChangeFunc,
}) => {
  const { t } = useTranslation();

  return (
    <ToggleContainer>
      <Toggle
        checked={isActive}
        label={isActive ? t("ACTIVE") : t("INACTIVE")}
        name="isActive"
        onChange={(name, value) => onChangeFunc(name, value)}
      />
    </ToggleContainer>
  );
};
