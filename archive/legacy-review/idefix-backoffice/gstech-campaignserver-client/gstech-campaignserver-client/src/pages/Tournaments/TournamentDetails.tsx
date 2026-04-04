import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { FormikHelpers } from "formik";
import { Content } from "app/types";

import { Loader, PageLayout, useConfirmationDialog } from "../../components";
import { RootState, AppDispatch } from "../../redux";
import { selectContentConfigByType } from "../../modules/app";
import { fetchContentById, removeContent, selectContentById, updateContent } from "../../modules/content";
import { TournamentForm } from "./";
import { CONTENT_TYPES } from "../../utils/constants";
import { useQueryParameter } from "../../hooks";

interface Params {
  brandId: string;
  tournamentId: string;
}

const TournamentDetails: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    push,
    replace,
    location: { pathname }
  } = useHistory();
  const { brandId, tournamentId } = useParams<Params>();
  const openConfirmationDialog = useConfirmationDialog();
  const searchParams = useQueryParameter();
  const initialLanguage = searchParams.get("language") || undefined;

  const tournament = useSelector((state: RootState) => selectContentById(state, tournamentId));
  const config = useSelector((state: RootState) => selectContentConfigByType(state, CONTENT_TYPES.tournament))!;

  const handleChangeLanguage = React.useCallback(
    (language: string | number | string[] | boolean) => {
      replace(`${pathname}?language=${language}`);
    },
    [replace, pathname]
  );

  const handleUpdateContent = React.useCallback(
    async (values: Content, formikHelpers: FormikHelpers<Content>) => {
      const resultAction = await dispatch(updateContent({ id: +tournamentId, values }));

      if (updateContent.fulfilled.match(resultAction)) {
        formikHelpers.setSubmitting(false);
        formikHelpers.resetForm(values);
      }
    },
    [dispatch, tournamentId]
  );

  const handleRemoveContent = React.useCallback(
    async (contentId: number) => {
      try {
        await openConfirmationDialog();
        const resultAction = await dispatch(removeContent(contentId));
        if (removeContent.fulfilled.match(resultAction)) {
          push(`/${brandId}/tournaments/`);
        }
      } catch (error) {
        // ignore
      }
    },
    [openConfirmationDialog, dispatch, push, brandId]
  );

  React.useEffect(() => {
    dispatch(fetchContentById(+tournamentId));
  }, [dispatch, tournamentId]);

  if (!tournament || !config) {
    return <Loader wrapped />;
  }

  return (
    <PageLayout>
      <TournamentForm
        initialValues={tournament}
        initialLanguage={initialLanguage}
        config={config}
        brandId={brandId}
        tournamentId={+tournamentId}
        onChangeLanguage={handleChangeLanguage}
        onSubmit={handleUpdateContent}
        onRemove={handleRemoveContent}
      />
    </PageLayout>
  );
};

export { TournamentDetails };
