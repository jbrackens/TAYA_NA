import * as React from "react";
import styled from "styled-components";
import { useHistory, useParams } from "react-router-dom";
import { CampaignStatus } from "app/types";
import { toast } from "react-toastify";

import api from "../../api";
import { Button, Dropdown, IconButton, Popup, MenuItem, Toggle, useConfirmationDialog, Label } from "../../components";
import { Stop, MoreVertical, Trash, Duplicate, Play } from "../../icons";
import { isTimePast } from "./utils";

const StyledCampaignActionsBlock = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
  height: 48px;

  & > :not(:first-child) {
    margin-left: 8px;
  }

  .actions__preview-toggle {
    .slider {
      background-color: ${({ theme }) => theme.palette.white};
    }

    input:checked + .slider {
      background-color: ${({ theme }) => theme.palette.white};
    }

    .slider:before {
      background-color: ${({ theme }) => theme.palette.blue};
    }
  }
`;

interface Params {
  brandId: string;
}

interface IProps {
  id: number;
  previewMode: boolean;
  campaignStatus: CampaignStatus;
  endTime?: string | null;
}

const CampaignActionsBlock: React.FC<IProps> = ({ id, endTime, campaignStatus, previewMode }) => {
  const { push } = useHistory();
  const { brandId } = useParams<Params>();
  const [loading, setLoading] = React.useState(false);
  const [togglePreview, setTogglePreview] = React.useState(previewMode);
  const openConfirmationDialog = useConfirmationDialog();

  const handleTogglePreview = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        event.stopPropagation();
        const response = await api.campaigns.togglePreview(id);
        setTogglePreview(response.data.data.previewMode);
      } catch (error) {
        if (error.response) {
          const errorMessage = error.response.data.error.message;
          return toast.error(errorMessage);
        }

        toast.error(`Ooops. Something wrong: ${error.message}`);
      }
    },
    [id]
  );

  const handleStopPropagation = React.useCallback(
    async (_value: string, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      event.stopPropagation();
    },
    []
  );

  const handleStartCampaign = React.useCallback(async () => {
    try {
      await api.campaigns.activateCampaign(id);
      push(`/${brandId}/campaigns/${id}/details`);
      window.location.reload();
    } catch (error) {
      setLoading(false);

      if (error.response) {
        const errorMessage = error.response.data.error.message;
        return toast.error(errorMessage);
      }

      toast.error(`Ooops. Something wrong: ${error.message}`);
    }
  }, [id, push, brandId]);

  const handleStopCampaign = React.useCallback(async () => {
    try {
      await api.campaigns.stopCampaign(id);
      push(`/${brandId}/campaigns/${id}/edit`);
      window.location.reload();
    } catch (error) {
      setLoading(false);

      if (error.response) {
        const errorMessage = error.response.data.error.message;
        return toast.error(errorMessage);
      }

      toast.error(`Ooops. Something wrong: ${error.message}`);
    }
  }, [id, push, brandId]);

  const handleArchiveCampaign = React.useCallback(async () => {
    try {
      await openConfirmationDialog();
    } catch (error) {
      return;
    }
    try {
      setLoading(true);
      await api.campaigns.archiveCampaign(id);
      setLoading(false);
      push(`/${brandId}/campaigns`);
    } catch (error) {
      setLoading(false);

      if (error.response) {
        const errorMessage = error.response.data.error.message;
        return toast.error(errorMessage);
      }

      toast.error(`Ooops. Something wrong: ${error.message}`);
    }
  }, [openConfirmationDialog, id, push, brandId]);

  const handleDuplicateCampaign = React.useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: {
          data: { campaignId }
        }
      } = await api.campaigns.duplicateCampaign(id);
      setLoading(false);
      push(`/${brandId}/campaigns/${campaignId}/edit`);
    } catch (error) {
      setLoading(false);

      if (error.response) {
        const errorMessage = error.response.data.error.message;
        return toast.error(errorMessage);
      }

      toast.error(`Ooops. Something wrong: ${error.message}`);
    }
  }, [id, push, brandId]);

  return (
    <StyledCampaignActionsBlock>
      {campaignStatus === "running" && (
        <Label className="running-label" color="green">
          Running
        </Label>
      )}
      {(campaignStatus === "running" || campaignStatus === "active") && (
        <Button onClick={handleStopCampaign} disabled={loading} icon={<Stop />}>
          Stop Campaign
        </Button>
      )}
      {campaignStatus === "draft" && (
        <Button onClick={handleStartCampaign} disabled={loading} icon={<Play />}>
          Start Campaign
        </Button>
      )}
      <Dropdown
        align="right"
        className="actions__dropdown"
        button={
          <IconButton disabled={loading} data-testid="dropdown">
            <MoreVertical />
          </IconButton>
        }
      >
        <Popup>
          <MenuItem value="duplicate" icon={<Duplicate />} onClick={handleDuplicateCampaign}>
            Duplicate
          </MenuItem>
          {campaignStatus === "draft" && (
            <MenuItem
              value="previewMode"
              icon={
                <Toggle checked={togglePreview} onChange={handleTogglePreview} className="actions__preview-toggle" />
              }
              onClick={handleStopPropagation}
            >
              Preview Mode
            </MenuItem>
          )}
          {(campaignStatus === "draft" || (campaignStatus === "running" && endTime && isTimePast(endTime))) && (
            <MenuItem value="archive" icon={<Trash />} red={true} onClick={handleArchiveCampaign}>
              Archive
            </MenuItem>
          )}
        </Popup>
      </Dropdown>
    </StyledCampaignActionsBlock>
  );
};

export default CampaignActionsBlock;
