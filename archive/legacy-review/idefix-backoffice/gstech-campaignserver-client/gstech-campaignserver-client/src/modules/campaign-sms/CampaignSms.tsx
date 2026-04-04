import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { Formik } from "formik";
import isNumber from "lodash/isNumber";

import { selectSmsesOptions } from "../app";
import {
  Card,
  CardHeader,
  CardContent,
  SimpleCardContent,
  PreviewCardContent,
  StatsCardContent,
  Button,
  DownloadCSVButton
} from "../../components";
import { Remove, Clock, Send, Users } from "../../icons";
import { CampaignSmsForm } from "./CampaignSmsForm";
import { selectCampaignId, selectCampaignAudienceStats, selectCampaignSmsStats } from "../campaign-info";
import { getSmsState, createSms, removeSms, updateSms } from "./campaignSmsSlice";
import { validationSchema } from "./validationSchema";
import api from "../../api";
import { toast } from "react-toastify";
import { AppDispatch, RootState } from "../../redux";

const StyledSms = styled.div`
  .description {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }

  .sms-form {
    margin-top: 32px;
  }

  .sending-time {
    margin-top: 16px;
  }

  .sms-info {
    display: flex;
    margin-top: 8px;

    & > :nth-child(2) {
      align-self: flex-start;
      margin-left: 16px;
    }
  }

  .sms__remove-button {
    fill: ${({ theme }) => theme.palette.blackMiddle};

    &:hover {
      cursor: pointer;
      fill: ${({ theme }) => theme.palette.blackDark};
    }
  }

  .sms-actions {
    display: flex;
    align-items: center;
    margin-top: 16px;

    & > :nth-child(2) {
      margin-left: 16px;
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
  }

  .download-csv-block {
    display: flex;
    align-items: center;
    margin-top: 32px;

    &__text {
      margin-left: 12px;
      color: ${({ theme }) => theme.palette.blackDark};
    }

    &__icon {
      width: 20px;
      height: 20px;
      margin-left: 4px;
      fill: ${({ theme }) => theme.palette.blackDark};
    }
  }
`;

export interface IFormValues {
  contentId?: number;
  sendingTime: null | Date | string;
}

interface IProps {
  isEditable: boolean;
}

const CampaignSms: React.FC<IProps> = ({ isEditable }) => {
  const dispatch: AppDispatch = useDispatch();
  const availableSmses = useSelector(selectSmsesOptions);
  const campaignId = useSelector(selectCampaignId);
  const campaignAudienceStats = useSelector((state: RootState) => selectCampaignAudienceStats(state, "smsAudience"));
  const campaignSmsStats = useSelector(selectCampaignSmsStats);
  const {
    isLoading,
    smsTemplate: { contentId, smsId, sendingTime, sendToAll, info, name }
  } = useSelector(getSmsState);
  const { push } = useHistory();
  const { url } = useRouteMatch();

  const [sending, setSending] = React.useState(false);

  const handleSubmit = React.useCallback(
    values => {
      if (campaignId && !isNumber(smsId)) {
        dispatch(createSms({ campaignId, values }));
      }

      if (campaignId && isNumber(smsId)) {
        dispatch(updateSms({ campaignId, smsId, values }));
      }
    },
    [dispatch, campaignId, smsId]
  );

  const handleRemoveSms = React.useCallback(
    resetForm => {
      if (isNumber(smsId)) {
        dispatch(removeSms({ campaignId: campaignId!, smsId }));
        resetForm({ values: { sendingTime: null } });
      }
    },
    [dispatch, smsId, campaignId]
  );

  const handleOpenPreviewDrawer = React.useCallback(
    () => push({ pathname: url, search: "drawer=sms-preview", state: { hasPrevRoute: true } }),
    [push, url]
  );

  const handleSendSmses = React.useCallback(async () => {
    try {
      setSending(true);
      await api.campaigns.sendSmses(campaignId!);
      setSending(false);
      toast.success(`Smses sent!`);
    } catch (error) {
      setSending(false);
      if (!error.response) {
        toast.error(`Sending smses failed: ${error.message}`);
      }

      toast.error(`Sending smses failed: ${error.response.data.error.message}`);
    }
  }, [campaignId]);

  const initialValues: IFormValues = React.useMemo(
    () => ({
      sendingTime,
      contentId,
      sendToAll
    }),
    [sendingTime, contentId, sendToAll]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
      {({ resetForm, setFieldValue }) => (
        <StyledSms>
          <h2 className="text-header">SMS</h2>
          {isEditable && (
            <p className="description text-main-reg">Select template of SMS sent to members of this campaign.</p>
          )}
          {!isEditable && sendingTime && (
            <Card className="sending-time">
              <CardContent>
                <SimpleCardContent title="Send time" icon={<Clock />}>
                  {sendingTime?.slice(0, 5)}
                </SimpleCardContent>
              </CardContent>
            </Card>
          )}
          <CampaignSmsForm
            className="sms-form"
            isLoading={isLoading}
            isEditable={isEditable}
            smsOptions={availableSmses}
            setFieldValue={setFieldValue}
          />
          {contentId && name && info && (
            <div className="sms-info">
              <Card className="selected-sms" appearance="flat">
                <CardHeader
                  action={
                    isEditable && (
                      <Remove
                        className="sms__remove-button"
                        onClick={() => handleRemoveSms(resetForm)}
                        data-testid="delete-button"
                      />
                    )
                  }
                >
                  {name}
                </CardHeader>
                <CardContent>
                  <PreviewCardContent info={info} previewButton={true} onPreviewClick={handleOpenPreviewDrawer} />
                </CardContent>
              </Card>
              <Card appearance="flat">
                <CardContent>
                  <StatsCardContent
                    stats={campaignSmsStats?.map(({ name, value }) => ({ title: name, value })) || []}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          {!isEditable && contentId && (
            <div className="sms-actions">
              <Button onClick={handleSendSmses} icon={<Send />} disabled={sending}>
                Send Now
              </Button>
              <span className="text-small-reg">For who has not received it yet</span>
            </div>
          )}
          <div className="download-csv-block">
            <DownloadCSVButton campaignId={campaignId!} type="sms" />
            <p className="download-csv-block__text text-main-med">
              Contacts in list: {campaignAudienceStats ? campaignAudienceStats.value : "..."}
            </p>
            <Users className="download-csv-block__icon" />
          </div>
        </StyledSms>
      )}
    </Formik>
  );
};

export { CampaignSms };
