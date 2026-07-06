import React from "react";
import { useTranslation } from "i18n";
import { CoreAlert } from "../ui/alert";

type ErrorComponentProps = {
  errors?: Array<{ errorCode: string }>;
  translationKey: string;
};

const ErrorComponent: React.FC<ErrorComponentProps> = ({
  errors,
  translationKey,
}) => {
  const { t } = useTranslation([translationKey, "error-component"]);

  const renderErrors = () => {
    return errors ? (
      errors.map((error, i: number) => {
        return (
          <CoreAlert
            key={i}
            message={t(`${translationKey}:${error.errorCode}`)}
            type="error"
            showIcon
          />
        );
      })
    ) : (
      <CoreAlert
        message={t(`error-component:UNKNOWN_ERROR`)}
        type="error"
        showIcon
      />
    );
  };

  return <>{renderErrors()}</>;
};

export { ErrorComponent };
