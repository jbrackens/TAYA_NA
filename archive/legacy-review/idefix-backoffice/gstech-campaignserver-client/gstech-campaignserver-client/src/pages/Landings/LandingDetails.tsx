import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { FormikHelpers } from "formik";
import { Content } from "app/types";

import { Loader, PageLayout, useConfirmationDialog } from "../../components";
import { RootState, AppDispatch } from "../../redux";
import { selectContentConfigByType } from "../../modules/app";
import { fetchContentById, removeContent, selectContentById, updateContent } from "../../modules/content";
import { LandingForm } from "./";
import { CONTENT_TYPES } from "../../utils/constants";
import { useQueryParameter } from "../../hooks";

interface Params {
  brandId: string;
  landingId: string;
}

const LandingDetails: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    push,
    replace,
    location: { pathname }
  } = useHistory();
  const { brandId, landingId } = useParams<Params>();
  const openConfirmationDialog = useConfirmationDialog();
  const searchParams = useQueryParameter();
  const initialLanguage = searchParams.get("language") || undefined;

  const landing = useSelector((state: RootState) => selectContentById(state, landingId));
  const config = useSelector((state: RootState) => selectContentConfigByType(state, CONTENT_TYPES.landingPage))!;

  const handleChangeLanguage = React.useCallback(
    (language: string | number | string[] | boolean) => {
      replace(`${pathname}?language=${language}`);
    },
    [replace, pathname]
  );

  const handleUpdateContent = React.useCallback(
    async (values: Content, formikHelpers: FormikHelpers<Content>) => {
      const resultAction = await dispatch(updateContent({ id: +landingId, values }));

      if (updateContent.fulfilled.match(resultAction)) {
        formikHelpers.setSubmitting(false);
        formikHelpers.resetForm(values);
      }
    },
    [dispatch, landingId]
  );

  const handleRemoveContent = React.useCallback(
    async (contentId: number) => {
      try {
        await openConfirmationDialog();
        const resultAction = await dispatch(removeContent(contentId));
        if (removeContent.fulfilled.match(resultAction)) {
          push(`/${brandId}/landings/`);
        }
      } catch (error) {
        // ignore
      }
    },
    [openConfirmationDialog, dispatch, push, brandId]
  );

  React.useEffect(() => {
    dispatch(fetchContentById(+landingId));
  }, [dispatch, landingId]);

  if (!landing || !config) {
    return <Loader wrapped />;
  }

  return (
    <PageLayout>
      <LandingForm
        initialValues={landing}
        initialLanguage={initialLanguage}
        config={config}
        brandId={brandId}
        landingId={+landingId}
        onChangeLanguage={handleChangeLanguage}
        onSubmit={handleUpdateContent}
        onRemove={handleRemoveContent}
      />
    </PageLayout>
  );
};

export { LandingDetails };
