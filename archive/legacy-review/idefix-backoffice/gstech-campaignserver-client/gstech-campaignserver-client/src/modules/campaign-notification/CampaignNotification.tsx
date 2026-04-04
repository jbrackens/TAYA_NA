import * as React from "react";
import styled from "styled-components";
import { Formik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import isNumber from "lodash/isNumber";
import { useRouteMatch, useHistory } from "react-router-dom";

import { selectNotificationOptions } from "../app";
import { Card, CardHeader, CardContent, PreviewCardContent, StatsCardContent } from "../../components";
import { Remove } from "../../icons";
import {
  getNotificationState,
  createNotification,
  updateNotification,
  removeNotification
} from "./campaignNotificationSlice";
import { selectCampaignId, selectCampaignNotificationStats } from "../campaign-info";
import { CampaignNotificationForm } from "./CampaignNotificationForm";
import { validationSchema } from "./validationSchema";
import { AppDispatch } from "../../redux";

const StyledNotification = styled.div`
  .description {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }
  .notification-form {
    margin-top: 32px;
  }

  .notification-info {
    display: flex;
    margin-top: 8px;

    & > :nth-child(2) {
      align-self: flex-start;
      margin-left: 16px;
    }
  }

  .notification__remove-button {
    fill: ${({ theme }) => theme.palette.blackMiddle};

    &:hover {
      cursor: pointer;
      fill: ${({ theme }) => theme.palette.blackDark};
    }
  }
`;

export interface IFormValues {
  contentId?: number;
}

interface IProps {
  isEditable: boolean;
}

const CampaignNotification: React.FC<IProps> = ({ isEditable }) => {
  const dispatch: AppDispatch = useDispatch();

  const { push } = useHistory();
  const { url } = useRouteMatch();

  const availableNotifications = useSelector(selectNotificationOptions);
  const campaignId = useSelector(selectCampaignId);
  const campaignsNotificationStats = useSelector(selectCampaignNotificationStats);
  const {
    isLoading,
    notificationTemplate: { contentId, notificationId, info, name }
  } = useSelector(getNotificationState);

  const handleSubmit = React.useCallback(
    values => {
      if (campaignId && !isNumber(notificationId)) {
        dispatch(createNotification({ campaignId, values }));
      }

      if (campaignId && isNumber(notificationId)) {
        dispatch(updateNotification({ campaignId, notificationId, values }));
      }
    },
    [dispatch, campaignId, notificationId]
  );

  const handleRemoveNotification = React.useCallback(
    resetForm => {
      if (isNumber(notificationId)) {
        dispatch(removeNotification({ campaignId: campaignId!, notificationId }));
        resetForm();
      }
    },
    [dispatch, notificationId, campaignId]
  );

  const handlePreviewClick = React.useCallback(
    () => push({ pathname: url, search: "drawer=notification-preview", state: { hasPrevRoute: true } }),
    [push, url]
  );

  const initialValues: IFormValues = React.useMemo(
    () => ({
      contentId
    }),
    [contentId]
  );

  if (!isEditable && !contentId) return null;

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
      {({ resetForm, setFieldValue }) => (
        <StyledNotification>
          <h2 className="text-header">Notification</h2>
          {isEditable && (
            <p className="description text-main-reg">
              Select template of notification shown to members of this campaign.
            </p>
          )}
          <CampaignNotificationForm
            className="notification-form"
            isLoading={isLoading}
            isEditable={isEditable}
            notificationsOptions={availableNotifications}
            setFieldValue={setFieldValue}
          />
          {contentId && name && info && (
            <div className="notification-info">
              <Card appearance="flat">
                <CardHeader
                  action={
                    isEditable && (
                      <Remove
                        className="notification__remove-button"
                        onClick={() => handleRemoveNotification(resetForm)}
                        data-testid="delete-button"
                      />
                    )
                  }
                >
                  {name}
                </CardHeader>
                <CardContent>
                  <PreviewCardContent info={info} previewButton={true} onPreviewClick={handlePreviewClick} />
                </CardContent>
              </Card>
              <Card appearance="flat">
                <CardContent>
                  <StatsCardContent
                    stats={campaignsNotificationStats?.map(({ name, value }) => ({ title: name, value })) || []}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </StyledNotification>
      )}
    </Formik>
  );
};

export { CampaignNotification };
