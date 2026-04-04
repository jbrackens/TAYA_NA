import * as React from "react";
import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";
import isNumber from "lodash/isNumber";
import { Formik } from "formik";
import { toast } from "react-toastify";
import { useHistory, useRouteMatch } from "react-router-dom";

import { validationSchema } from "./validationSchema";
import { selectCampaignId, selectCampaignAudienceStats, selectCampaignEmailStats } from "../campaign-info";
import {
  Card,
  CardContent,
  CardHeader,
  PreviewCardContent,
  SimpleCardContent,
  StatsCardContent,
  Button,
  DownloadCSVButton
} from "../../components";
import { Clock, Send, Remove, Users } from "../../icons";
import { getEmailState, createEmail, updateEmail, removeEmail } from "./campaignEmailSlice";
import { CampaignEmailForm } from "./CampaignEmailForm";
import { selectEmailOptions } from "../app";
import api from "../../api";
import { AppDispatch, RootState } from "../../redux";

const StyledEmail = styled.div`
  .description {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }

  .email-form {
    margin-top: 32px;
  }

  .sending-time {
    margin-top: 16px;
  }

  .email-info {
    display: flex;
    margin-top: 8px;

    & > :nth-child(2) {
      align-self: flex-start;
      margin-left: 16px;
    }
  }

  .email__remove-button {
    fill: ${({ theme }) => theme.palette.blackMiddle};

    &:hover {
      cursor: pointer;
      fill: ${({ theme }) => theme.palette.blackDark};
    }
  }

  .email-actions {
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

const CampaignEmail: React.FC<IProps> = ({ isEditable }) => {
  const dispatch: AppDispatch = useDispatch();
  const availableEmails = useSelector(selectEmailOptions);
  const campaignId = useSelector(selectCampaignId);
  const campaignAudienceStats = useSelector((state: RootState) => selectCampaignAudienceStats(state, "emailAudience"));
  const campaignsEmailStats = useSelector(selectCampaignEmailStats);
  const {
    isLoading,
    emailTemplate: { sendingTime, sendToAll, contentId, emailId, info, name }
  } = useSelector(getEmailState);
  const { push } = useHistory();
  const { url } = useRouteMatch();

  const [sending, setSending] = React.useState(false);

  const handleSubmit = React.useCallback(
    values => {
      campaignId &&
        (isNumber(emailId)
          ? dispatch(updateEmail({ campaignId, emailId, values }))
          : dispatch(createEmail({ campaignId, values })));
    },
    [dispatch, campaignId, emailId]
  );

  const handleRemoveEmail = React.useCallback(
    resetForm => {
      if (isNumber(emailId)) {
        dispatch(removeEmail({ campaignId: campaignId!, emailId }));
        resetForm({ values: { sendingTime: null } });
      }
    },
    [dispatch, emailId, campaignId]
  );

  const handleOpenPreviewDrawer = React.useCallback(
    () => push({ pathname: url, search: "drawer=email-preview", state: { hasPrevRoute: true } }),
    [push, url]
  );

  const handleSendEmails = React.useCallback(async () => {
    try {
      setSending(true);
      await api.campaigns.sendEmails(campaignId!);
      setSending(false);
      toast.success(`Emails sent!`);
    } catch (error) {
      setSending(false);
      if (!error.response) {
        toast.error(`Sending emails failed: ${error.message}`);
      }

      toast.error(`Sending emails failed: ${error.response.data.error.message}`);
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
        <StyledEmail>
          <h2 className="text-header">Email</h2>
          {isEditable && (
            <p className="description text-main-reg">Select template of email sent to members of this campaign.</p>
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
          <CampaignEmailForm
            className="email-form"
            isLoading={isLoading}
            isEditable={isEditable}
            emailsOptions={availableEmails}
            setFieldValue={setFieldValue}
          />
          {contentId && name && info && (
            <div className="email-info">
              <Card appearance="flat">
                <CardHeader
                  action={
                    isEditable && (
                      <Remove
                        className="email__remove-button"
                        onClick={() => handleRemoveEmail(resetForm)}
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
                    stats={campaignsEmailStats?.map(({ name, value }) => ({ title: name, value })) || []}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          {!isEditable && contentId && (
            <>
              <div className="email-actions">
                <Button onClick={handleSendEmails} icon={<Send />} disabled={sending}>
                  Send Now
                </Button>
                <span className="text-small-reg">For who has not received it yet</span>
              </div>
            </>
          )}
          <div className="download-csv-block">
            <DownloadCSVButton campaignId={campaignId!} type="email" />
            <p className="download-csv-block__text text-main-med">
              Contacts in list: {campaignAudienceStats ? campaignAudienceStats.value : "..."}
            </p>
            <Users className="download-csv-block__icon" />
          </div>
        </StyledEmail>
      )}
    </Formik>
  );
};

export { CampaignEmail };
