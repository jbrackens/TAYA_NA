import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { FormikHelpers } from "formik";
import { Content } from "app/types";

import { Loader, PageLayout, useConfirmationDialog } from "../../components";
import { RootState, AppDispatch } from "../../redux";
import { selectContentConfigByType } from "../../modules/app";
import { fetchContentById, removeContent, selectContentById, updateContent } from "../../modules/content";
import { LocalizationForm } from "./";
import { CONTENT_TYPES } from "../../utils/constants";
import { useQueryParameter } from "../../hooks";

interface Params {
  brandId: string;
  localizationId: string;
}

const LocalizationDetails: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    push,
    replace,
    location: { pathname }
  } = useHistory();
  const { brandId, localizationId } = useParams<Params>();
  const openConfirmationDialog = useConfirmationDialog();
  const searchParams = useQueryParameter();
  const initialLanguage = searchParams.get("language") || undefined;

  const landing = useSelector((state: RootState) => selectContentById(state, localizationId));
  const config = useSelector((state: RootState) => selectContentConfigByType(state, CONTENT_TYPES.localization))!;

  const handleChangeLanguage = React.useCallback(
    (language: string | number | string[] | boolean) => {
      replace(`${pathname}?language=${language}`);
    },
    [replace, pathname]
  );

  const handleUpdateContent = React.useCallback(
    async (values: Content, formikHelpers: FormikHelpers<Content>) => {
      const resultAction = await dispatch(updateContent({ id: +localizationId, values }));

      if (updateContent.fulfilled.match(resultAction)) {
        formikHelpers.setSubmitting(false);
        formikHelpers.resetForm(values);
      }
    },
    [dispatch, localizationId]
  );

  const handleRemoveContent = React.useCallback(
    async (contentId: number) => {
      try {
        await openConfirmationDialog();
        const resultAction = await dispatch(removeContent(contentId));
        if (removeContent.fulfilled.match(resultAction)) {
          push(`/${brandId}/localizations/`);
        }
      } catch (error) {
        // ignore
      }
    },
    [openConfirmationDialog, dispatch, push, brandId]
  );

  React.useEffect(() => {
    dispatch(fetchContentById(+localizationId));
  }, [dispatch, localizationId]);

  if (!landing || !config) {
    return <Loader wrapped />;
  }

  return (
    <PageLayout>
      <LocalizationForm
        initialValues={landing}
        initialLanguage={initialLanguage}
        config={config}
        brandId={brandId}
        localizationId={+localizationId}
        onChangeLanguage={handleChangeLanguage}
        onSubmit={handleUpdateContent}
        onRemove={handleRemoveContent}
      />
    </PageLayout>
  );
};

export { LocalizationDetails };
