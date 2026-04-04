import * as React from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";

import { CampaignBannerForm } from "./CampaignBannerForm";
import { getIsLoading } from "./campaignBannerSlice";
import { selectBannerLocationsByBrand } from "../app";
import { RootState } from "../../redux";

const StyledBanner = styled.div`
  .description {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }

  .banner-form {
    margin-top: 32px;
  }
`;

interface IProps {
  isEditable: boolean;
}

interface Params {
  brandId: string;
}

const CampaignBanner = ({ isEditable }: IProps) => {
  const { brandId } = useParams<Params>();
  const locationsList = useSelector((state: RootState) => selectBannerLocationsByBrand(state, brandId));
  const isLoading = useSelector(getIsLoading);

  return (
    <StyledBanner>
      <h2 className="text-header">Banner</h2>
      {isEditable && <p className="description text-main-reg">Select a banner for location</p>}
      <CampaignBannerForm
        className="banner-form"
        locationsList={locationsList}
        isLoading={isLoading}
        isEditable={isEditable}
      />
    </StyledBanner>
  );
};

export { CampaignBanner };
