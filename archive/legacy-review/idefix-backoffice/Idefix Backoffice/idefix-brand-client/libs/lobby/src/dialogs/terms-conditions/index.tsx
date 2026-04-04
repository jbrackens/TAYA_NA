import React from "react";
import { ApiContext } from "@brandserver-client/api";
import TermsConditionsView from "./TermConditionsView";
interface Props {
  content: {
    termsConditions: string;
    privacyPolicy: string;
    bonusTerms: string;
  };
  fetchTermsConditionsContent: () => Promise<{ content: string }>;
}

const TermsConditions: React.FC<Props> = ({
  content,
  fetchTermsConditionsContent
}) => {
  const api = React.useContext(ApiContext);
  React.useEffect(() => {
    fetchTermsConditionsContent();
  }, []);

  const onConfirm = React.useCallback(async () => {
    const response = await api.termsConditions.confirmTermsConditions();
    if (response.ok) {
      window.location.reload();
    }
  }, []);

  return <TermsConditionsView content={content} onSubmit={onConfirm} />;
};

export default TermsConditions;
