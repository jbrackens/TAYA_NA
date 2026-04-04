import * as React from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { Formik, Form } from "formik";
import isNumber from "lodash/isNumber";

import { LocationBanner } from "./components/LocationBanner";
import AutoSubmit from "./components/AutoSubmit";
import { createBanner, getBanner, updateBanner } from "./campaignBannerSlice";
import { validationSchema } from "./validationSchema";
import { selectCampaignId } from "../campaign-info";
import { AppDispatch } from "../../redux";

const StyledBannerForm = styled(Form)`
  & > :not(:first-child) {
    margin-top: 24px;
  }
`;

export interface IFormValues {
  contentId?: number;
}

interface IBannerForm {
  className?: string;
  locationsList: string[];
  isLoading: boolean;
  isEditable: boolean;
}

const CampaignBannerForm = ({ className, locationsList, isLoading, isEditable }: IBannerForm) => {
  const dispatch: AppDispatch = useDispatch();
  const banner = useSelector(getBanner);
  const { contentId, bannerId } = banner;
  const campaignId = useSelector(selectCampaignId);

  const handleSubmit = React.useCallback(
    values => {
      if (campaignId && !isNumber(bannerId)) {
        dispatch(createBanner({ campaignId, values }));
      }

      if (campaignId && isNumber(bannerId)) {
        dispatch(updateBanner({ campaignId, bannerId, values }));
      }
    },
    [bannerId, campaignId, dispatch]
  );

  const initialValues: IFormValues = React.useMemo(() => ({ contentId }), [contentId]);

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
      {({ setFieldValue, resetForm }) => (
        <StyledBannerForm className={className}>
          {locationsList?.map(location => {
            const locationBanner = banner?.location === location ? banner : null;
            return (
              <LocationBanner
                key={location}
                location={location}
                banner={locationBanner}
                isEditable={isEditable}
                isLoading={isLoading}
                setFieldValue={setFieldValue}
                resetForm={resetForm}
              />
            );
          })}
          <AutoSubmit />
        </StyledBannerForm>
      )}
    </Formik>
  );
};

export { CampaignBannerForm };
