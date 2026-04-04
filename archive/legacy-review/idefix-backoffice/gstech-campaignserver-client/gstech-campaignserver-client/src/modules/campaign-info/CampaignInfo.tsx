import * as React from "react";
import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";
import { useParams, Link, useHistory } from "react-router-dom";
import { Formik, FormikHelpers } from "formik";
import isEqual from "lodash/isEqual";

import { selectCampaignInfo, selectGroupCampaigns, updateCampaign, updateCampaignGroupName } from "./campaignInfoSlice";
import AutoSubmit from "./AutoSubmit";
import CampaignActionsBlock from "./CampaignActionsBlock";
import { CampaignInfoForm } from "./CampaignInfoForm";
import { IFormValues } from "./types";
import { validationSchema } from "./validationSchema";
import { AppDispatch } from "../../redux";
import { BackButton, Loader } from "../../components";
import { CampaignGroupName } from "./components/CampaignGroupName";
import { FormikField } from "../../fields";
import { Folder } from "../../icons";
import { GroupCampaignsTabs } from "./components/GroupCampaignsTabs";

const StyledCampaignInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .group-block {
    padding-top: 32px;
    border-bottom: 1px solid ${({ theme }) => theme.palette.blackLight};
  }

  .group-block__info {
    display: flex;
    align-items: center;

    & > :not(:first-child) {
      margin-left: 16px;
    }
  }

  .group-block__tabs {
    margin-top: 32px;
  }

  .info-block {
    display: flex;
    margin-top: 32px;

    & > .loader-wrapper {
      margin-top: 28px;
      margin-right: 24px;

      max-width: 32px;
      max-height: 32px;
    }
  }
`;

interface IProps {
  isEditable: boolean;
}

interface Params {
  brandId: string;
}

const CampaignInfo: React.FC<IProps> = ({ isEditable }) => {
  const dispatch: AppDispatch = useDispatch();
  const { brandId } = useParams<Params>();
  const { push } = useHistory();
  const { info } = useSelector(selectCampaignInfo);
  const campaigns = useSelector(selectGroupCampaigns);
  const { name, startTime, endTime, id, status, previewMode, group, groupId } = info!;

  React.useLayoutEffect(() => {
    if (status === "running") {
      push(`/${brandId}/campaigns/${id}/details`);
    }
  }, [brandId, id, push, status]);

  const initialValues = React.useMemo(
    () => ({
      name,
      startTime,
      endTime,
      brandId,
      group
    }),
    [name, startTime, endTime, brandId, group]
  );

  const handleSubmit = React.useCallback(
    async (values: IFormValues, formikHelpers: FormikHelpers<IFormValues>) => {
      if (values.group?.name !== group.name && groupId) {
        const data = { groupId, name: values.group!.name };
        await dispatch(updateCampaignGroupName(data));
        formikHelpers.setSubmitting(false);
        return;
      }

      if (!isEqual(values, initialValues)) {
        await dispatch(updateCampaign(values));
        formikHelpers.setSubmitting(false);
        return;
      }
    },
    [dispatch, group.name, groupId, initialValues]
  );

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {({ values, isSubmitting }) => (
        <StyledCampaignInfo>
          <div className="group-block">
            <div className="group-block__info">
              <Link to={`/${brandId}/campaigns`} data-testid="back-button">
                <BackButton type="button" />
              </Link>
              <Folder />
              <FormikField name="group.name" disabled={isSubmitting}>
                <CampaignGroupName placeholder="Group Name" />
              </FormikField>
            </div>
            <div className="group-block__tabs">
              <GroupCampaignsTabs groupId={groupId} selectedCampaignId={id} campaigns={campaigns} />
            </div>
          </div>
          <div className="info-block">
            <CampaignInfoForm values={values} disabled={!isEditable || isSubmitting} withDate />
            {isSubmitting && (
              <div className="loader-wrapper" data-testid="loader">
                <Loader />
              </div>
            )}
            <CampaignActionsBlock id={id} campaignStatus={status} previewMode={previewMode} />
          </div>
          <AutoSubmit />
        </StyledCampaignInfo>
      )}
    </Formik>
  );
};

export { CampaignInfo };
