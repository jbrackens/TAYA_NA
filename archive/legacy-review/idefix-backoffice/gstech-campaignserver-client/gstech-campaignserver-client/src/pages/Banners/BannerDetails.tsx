import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { Content } from "app/types";
import { FormikHelpers } from "formik";

import { BannerForm } from "./BannerForm";
import { PageLayout, Loader, useConfirmationDialog } from "../../components";
import { RootState, AppDispatch } from "../../redux";
import { selectContentConfigByType } from "../../modules/app";
import { fetchContent, removeContent, selectContentById, updateContent } from "../../modules/content";
import { CONTENT_TYPES } from "../../utils/constants";
import { useQueryParameter } from "../../hooks";

interface Params {
  brandId: string;
  bannerId: string;
}

const BannerDetails: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    push,
    replace,
    location: { pathname }
  } = useHistory();
  const { brandId, bannerId } = useParams<Params>();
  const contentType = CONTENT_TYPES.banner;
  const searchParams = useQueryParameter();
  const initialLanguage = searchParams.get("language") || undefined;
  const banner = useSelector((state: RootState) => selectContentById(state, bannerId));
  const config = useSelector((state: RootState) => selectContentConfigByType(state, contentType));
  const openConfirmationDialog = useConfirmationDialog();

  React.useEffect(() => {
    if (!banner && brandId) dispatch(fetchContent({ brandId, contentType }));
  }, [banner, brandId, contentType, dispatch]);

  const handleChangeLanguage = React.useCallback(
    (language: string | number | string[] | boolean) => {
      replace(`${pathname}?language=${language}`);
    },
    [replace, pathname]
  );

  const handleSubmit = React.useCallback(
    async (values: Content, formikHelpers: FormikHelpers<Content>) => {
      try {
        const resultAction = await dispatch(updateContent({ id: Number(bannerId), values }));

        if (updateContent.fulfilled.match(resultAction)) {
          formikHelpers.setSubmitting(false);
          formikHelpers.resetForm(values);
        }
      } catch (error) {
        console.log(error);
      }
    },
    [bannerId, dispatch]
  );

  const handleRemoveContent = React.useCallback(
    async (contentId: number) => {
      try {
        await openConfirmationDialog();
        const resultAction = await dispatch(removeContent(contentId));
        if (removeContent.fulfilled.match(resultAction)) {
          push(`/${brandId}/banners/`);
        }
      } catch (error) {
        console.log(error);
      }
    },
    [openConfirmationDialog, dispatch, push, brandId]
  );

  if (!banner || !config) {
    return <Loader wrapped />;
  }

  return (
    <PageLayout>
      <BannerForm
        brandId={brandId}
        bannerId={Number(bannerId)}
        initialValues={banner}
        initialLanguage={initialLanguage}
        config={config}
        onChangeLanguage={handleChangeLanguage}
        onSubmit={handleSubmit}
        onRemove={handleRemoveContent}
      />
    </PageLayout>
  );
};

export { BannerDetails };
