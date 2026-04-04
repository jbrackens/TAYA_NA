import * as React from "react";
import { useParams, useHistory } from "react-router-dom";
import styled from "styled-components";
import { Button } from "../../../components";
import { Plus } from "../../../icons";

const StyledGroupCampaignsTabs = styled.div`
  display: flex;
  overflow-x: auto;
  padding-bottom: 24px;

  & > :not(:first-child) {
    margin-left: 16px;
  }
`;

interface Params {
  brandId: string;
}

interface Props {
  groupId: number | null;
  selectedCampaignId: number;
  campaigns?: { id: number; name: string }[];
}

export const GroupCampaignsTabs: React.FC<Props> = ({ groupId, selectedCampaignId, campaigns = [] }) => {
  const { push } = useHistory();
  const { brandId } = useParams<Params>();

  const handleAddCampaignToGroup = React.useCallback(() => {
    push(`/${brandId}/campaigns/new/${groupId}`);
  }, [brandId, groupId, push]);

  const handleChangeCampaign = React.useCallback(
    (id: number) => () => {
      push(`/${brandId}/campaigns/${id}/edit`);
    },
    [brandId, push]
  );

  return (
    <StyledGroupCampaignsTabs>
      {campaigns?.map(campaign => (
        <Button
          key={campaign.id}
          disabled={selectedCampaignId === campaign.id}
          onClick={handleChangeCampaign(campaign.id)}
          appearance={campaign.name.includes("CRD") ? "teal" : campaign.name.includes("HRL") ? "orange" : undefined}
        >
          {campaign.name}
        </Button>
      ))}
      <Button appearance="flat" icon={<Plus />} onClick={handleAddCampaignToGroup}>
        Add campaign
      </Button>
    </StyledGroupCampaignsTabs>
  );
};
