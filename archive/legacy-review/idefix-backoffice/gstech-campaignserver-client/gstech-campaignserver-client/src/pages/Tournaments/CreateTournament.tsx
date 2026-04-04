import * as React from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { Content } from "app/types";

import { RootState } from "../../redux";
import { Loader, PageLayout } from "../../components";
import { selectContentConfigByType } from "../../modules/app";
import { useCreateContent } from "../../modules/content";
import { TournamentForm } from ".";
import { CONTENT_TYPES } from "../../utils/constants";

interface Params {
  brandId: string;
}

const CreateTournament: React.FC = () => {
  const { brandId } = useParams<Params>();
  const [language, setLanguage] = React.useState<string>("en");
  const contentType = CONTENT_TYPES.tournament;
  const config = useSelector((state: RootState) => selectContentConfigByType(state, contentType));

  const { initialValues, handleCreateContent } = useCreateContent({
    config,
    brandId,
    contentType
  });

  const handleChangeLanguage = React.useCallback(
    (language: string | number | string[] | boolean) => setLanguage(language as string),
    []
  );

  if (!config) {
    return <Loader wrapped />;
  }

  return (
    <PageLayout>
      <TournamentForm
        initialValues={initialValues as Content}
        initialLanguage={language}
        config={config}
        brandId={brandId}
        onChangeLanguage={handleChangeLanguage}
        onSubmit={handleCreateContent}
      />
    </PageLayout>
  );
};

export { CreateTournament };
