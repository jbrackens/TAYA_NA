import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";

import { SelectField } from "../../../fields";
import { useMounted } from "../../../hooks";
import { IFormValues } from "../types";
import { selectCampaigns } from "../../app";

interface Option {
  value: string | number;
  label: string;
}

interface Props {
  options: Option[];
  values: IFormValues;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  disabled?: boolean;
}

const StyledCampaignRewardRule = styled.div`
  display: flex;

  .rule__campaign-select {
    margin-right: 8px;
  }
`;

const CampaignRewardRule: React.FC<Props> = ({ options, values, setFieldValue, disabled }) => {
  const campaignId = values.values.campaignId;
  const mounted = useMounted();
  const campaigns = useSelector(selectCampaigns);

  const campaignRewardOptions = React.useMemo(() => {
    const campaign = campaigns.find(campaign => campaign.campaignId === campaignId);
    if (!campaign) {
      return [];
    }

    return campaign.rewardIds.map(reward => ({ value: reward, label: reward }));
  }, [campaignId, campaigns]);

  React.useEffect(() => {
    if (mounted && campaignId) {
      setFieldValue("values.rewardId", null);
    }
    // eslint-disable-next-line
  }, [mounted, campaignId]);

  return (
    <StyledCampaignRewardRule>
      <SelectField
        options={options}
        isMulti={false}
        name="values.campaignId"
        placeholder="Select campaign"
        className="rule__campaign-select"
        disabled={disabled}
      />
      {campaignId && (
        <SelectField
          options={campaignRewardOptions}
          name="values.rewardId"
          placeholder="Select reward"
          isMulti={false}
          disabled={disabled}
        />
      )}
    </StyledCampaignRewardRule>
  );
};

export default CampaignRewardRule;
