import * as React from "react";
import { CellProps } from "react-table";
import styled from "styled-components";
import { Campaign } from "app/types";
import { useHistory, useParams } from "react-router-dom";

import api from "../../../api";
import { Dropdown, Popup, MenuItem, useConfirmationDialog } from "../../../components";
import { Info, Trash, Duplicate, Edit, MoreVertical } from "../../../icons";
import { toast } from "react-toastify";
import { archiveCampaign, archiveGroup } from "../campaignsSlice";
import { AppDispatch } from "../../../redux";
import { useDispatch } from "react-redux";

const StyledShowMoreCell = styled.div`
  display: flex;
  align-items: center;
`;

interface Params {
  brandId: string;
}

const ShowMoreCell: React.FC<CellProps<Campaign>> = ({ cell }) => {
  const { push } = useHistory();
  const openConfirmationDialog = useConfirmationDialog();
  const dispatch: AppDispatch = useDispatch();
  const { brandId } = useParams<Params>();
  const { status, id } = cell.row.original;
  const isGroup = cell.row.depth === 0;

  const handleDuplicateCampaign = React.useCallback(async () => {
    try {
      const {
        data: {
          data: { campaignId }
        }
      } = await api.campaigns.duplicateCampaign(id);
      push(`/${brandId}/campaigns/${campaignId}/edit`);
    } catch (error) {
      const statusCode = error.response.status;
      if (statusCode >= 400 && statusCode < 500) {
        toast.error(`Duplicate campaign failed: ${error.response.data.error.message}`);
      } else {
        toast.error(`Duplicate campaign failed: ${error.message}`);
      }
      console.log(error.message, "error");
    }
  }, [id, push, brandId]);

  const handleDuplicateGroup = React.useCallback(async () => {
    const groupId = cell.row.original.id;
    try {
      const {
        data: {
          data: { firstCampaignId }
        }
      } = await api.campaigns.duplicateCampaignGroup(groupId);
      push(`/${brandId}/campaigns/${firstCampaignId}/edit`);
    } catch (error) {
      const statusCode = error.response.status;
      if (statusCode >= 400 && statusCode < 500) {
        toast.error(`Duplicate group failed: ${error.response.data.error.message}`);
      } else {
        toast.error(`Duplicate group failed: ${error.message}`);
      }
      console.log(error.message, "error");
    }
  }, [cell.row.original.id, push, brandId]);

  const handleArchiveCampaign = React.useCallback(async () => {
    try {
      await openConfirmationDialog();
      dispatch(archiveCampaign({ brandId, campaignId: id }));
    } catch (error) {
      // ignore
    }
  }, [brandId, dispatch, id, openConfirmationDialog]);

  const handleArchiveGroup = React.useCallback(async () => {
    const groupId = cell.row.original.id;
    try {
      await openConfirmationDialog();
      dispatch(archiveGroup({ brandId, groupId }));
    } catch (error) {
      // ignore
    }
  }, [brandId, cell.row.original.id, dispatch, openConfirmationDialog]);

  const groupItems = React.useMemo(
    () => (
      <>
        <MenuItem value="duplicate" icon={<Duplicate />} onClick={handleDuplicateGroup}>
          Duplicate Group
        </MenuItem>
        {status !== "archived" && (
          <MenuItem value="archive" icon={<Trash />} red={true} onClick={handleArchiveGroup}>
            Archive
          </MenuItem>
        )}
      </>
    ),
    [handleArchiveGroup, handleDuplicateGroup, status]
  );

  const campaignsItems = React.useMemo(() => {
    return (
      <>
        {status === "running" ||
          (status === "active" && (
            <MenuItem value="details" icon={<Info />} onClick={() => push(`/${brandId}/campaigns/${id}/details`)}>
              Details
            </MenuItem>
          ))}
        {status === "draft" && (
          <MenuItem value="edit" icon={<Edit />} onClick={() => push(`/${brandId}/campaigns/${id}/edit`)}>
            Edit
          </MenuItem>
        )}
        <MenuItem value="duplicate" icon={<Duplicate />} onClick={handleDuplicateCampaign}>
          Duplicate
        </MenuItem>
        {status !== "archived" && (
          <MenuItem value="archive" icon={<Trash />} red={true} onClick={handleArchiveCampaign}>
            Archive
          </MenuItem>
        )}
      </>
    );
  }, [brandId, handleArchiveCampaign, handleDuplicateCampaign, id, push, status]);

  return (
    <StyledShowMoreCell>
      <Dropdown align="right" button={<MoreVertical />}>
        <Popup>{isGroup ? groupItems : campaignsItems}</Popup>
      </Dropdown>
    </StyledShowMoreCell>
  );
};

export { ShowMoreCell };
