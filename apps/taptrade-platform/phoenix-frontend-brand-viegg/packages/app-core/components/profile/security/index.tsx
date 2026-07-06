import React from "react";
import { PasswordEditorComponent } from "./password-editor";
import { MfaToggleComponent } from "./mfa-toggle";
import {
  StyledCard,
  InfoRow,
  StyledDivider,
} from "../personal-details/index.styled";
import { useSelector } from "react-redux";
import { selectMfaToggleVisibility } from "../../../lib/slices/siteSettingsSlice";

const SecurityComponent: React.FC = () => {
  const isMfaToggleVisible = useSelector(selectMfaToggleVisibility);

  return (
    <StyledCard>
      <InfoRow>
        <PasswordEditorComponent />
      </InfoRow>
      <StyledDivider />
      {isMfaToggleVisible && (
        <InfoRow>
          <MfaToggleComponent />
        </InfoRow>
      )}
    </StyledCard>
  );
};

export { SecurityComponent };
