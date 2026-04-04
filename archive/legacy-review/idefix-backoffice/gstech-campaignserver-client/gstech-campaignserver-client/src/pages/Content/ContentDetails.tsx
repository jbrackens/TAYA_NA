import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { Content, ContentType } from "app/types";
import { FormikHelpers } from "formik";
import isNumber from "lodash/isNumber";

import { Loader, PageLayout, useConfirmationDialog } from "../../components";
import { useQueryParameter } from "../../hooks";
import { RootState, AppDispatch } from "../../redux";
import { selectContentById, updateContent, removeContent, fetchContentById } from "../../modules/content";
import { selectContentConfigByType } from "../../modules/app";
import { ContentForm } from "./ContentForm";

interface Params {
  brandId: string;
  contentId: string;
  contentType: string;
}

const ContentDetails: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    push,
    replace,
    location: { pathname }
  } = useHistory();
  const params = useParams<Params>();
  const searchParams = useQueryParameter();
  const openConfirmationDialog = useConfirmationDialog();

  const brandId = params.brandId;
  const contentType = params.contentType as ContentType;
  const contentId = Number(params.contentId);
  const initialLanguage = searchParams.get("language") || undefined;

  const content = useSelector((state: RootState) => selectContentById(state, contentId));
  const config = useSelector((state: RootState) => selectContentConfigByType(state, contentType));

  React.useEffect(() => {
    if (!content && isNumber(contentId)) dispatch(fetchContentById(contentId));
  }, [dispatch, contentId, content]);

  const handleChangeLanguage = React.useCallback(
    (language: string | number | string[] | boolean) => {
      replace(`${pathname}?language=${language}`);
    },
    [replace, pathname]
  );

  const handleUpdateContent = React.useCallback(
    async (values: Content, formikHelpers: FormikHelpers<Content>) => {
      const resultAction = await dispatch(updateContent({ id: contentId, values }));

      if (updateContent.fulfilled.match(resultAction)) {
        formikHelpers.setSubmitting(false);
        formikHelpers.resetForm(values);
      }
    },
    [dispatch, contentId]
  );

  const handleRemoveContent = React.useCallback(
    async (contentId: number) => {
      try {
        await openConfirmationDialog();
        const resultAction = await dispatch(removeContent(contentId));
        if (removeContent.fulfilled.match(resultAction)) {
          push(`/${brandId}/content/`);
        }
      } catch (error) {
        console.log(error);
      }
    },
    [openConfirmationDialog, dispatch, push, brandId]
  );

  if (!content || !config || !brandId) {
    return <Loader wrapped />;
  }

  return (
    <PageLayout>
      <ContentForm
        initialValues={content}
        initialLanguage={initialLanguage}
        config={config}
        brandId={brandId}
        contentId={contentId}
        contentType={contentType as ContentType}
        onChangeLanguage={handleChangeLanguage}
        onSubmit={handleUpdateContent}
        onRemove={handleRemoveContent}
      />
    </PageLayout>
  );
};

export { ContentDetails };
