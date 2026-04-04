import React, { FC, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { Content, ContentType } from "app/types";

import { RootState } from "../../redux";
import { Loader, PageLayout } from "../../components";
import { selectContentConfigByType } from "../../modules/app";
import { useCreateContent } from "../../modules/content";
import { ContentForm } from "./ContentForm";

interface Params {
  brandId: string;
  contentType: ContentType;
}

const CreateContent: FC = () => {
  const params = useParams<Params>();
  const brandId = params.brandId;
  const contentType = params.contentType as ContentType;
  const [language, setLanguage] = useState<string>("en");
  const config = useSelector((state: RootState) => selectContentConfigByType(state, contentType));

  const handleChangeLanguage = useCallback(
    (language: string | number | string[] | boolean) => setLanguage(language as string),
    []
  );

  const { initialValues, handleCreateContent } = useCreateContent({
    config,
    brandId,
    contentType: contentType
  });

  if (!config) {
    return <Loader wrapped />;
  }

  return (
    <PageLayout>
      <ContentForm
        initialValues={initialValues as Content}
        initialLanguage={language}
        config={config}
        brandId={brandId}
        contentType={contentType}
        onChangeLanguage={handleChangeLanguage}
        onSubmit={handleCreateContent}
      />
    </PageLayout>
  );
};

export { CreateContent };
