import * as React from "react";
import styled from "styled-components";
import { Formik, FormikHelpers } from "formik";
import { useParams } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import pickBy from "lodash/pickBy";
import identity from "lodash/identity";
import { NewCampaign as NewCampaignType } from "app/types";

import { BackButton, Button } from "../../components";
import { Save } from "../../icons";
import api from "../../api";
import { CampaignInfoForm, IFormValues, validationSchema } from "../../modules/campaign-info";

const StyledNewCampaign = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1440px;
  margin: 64px auto 0;
  padding: 32px;

  .back-button {
    margin-right: 24px;
  }

  & > div {
    display: flex;
    align-self: flex-start;
    align-items: center;
    height: 48px;
  }
`;

interface Params {
  brandId: string;
  groupId: string;
}

const NewCampaign = () => {
  const { brandId, groupId } = useParams<Params>();
  const { push, goBack } = useHistory();

  const handleSubmit = React.useCallback(
    async (values: IFormValues, { setSubmitting }: FormikHelpers<IFormValues>) => {
      try {
        const draft = {
          ...pickBy<IFormValues>(values, identity),
          brandId,
          creditMultiple: false,
          audienceType: "static"
        } as NewCampaignType;

        const response = await api.campaigns.createCampaign(draft);
        const campaignId = response.data.data.campaignId;
        setSubmitting(false);
        push(`/${brandId}/campaigns/${campaignId}/edit`);
      } catch (error) {
        if (error.response) {
          const errorMessage = error.response.data.error.message;
          return toast.error(errorMessage);
        }

        toast.error(`Ooops. Something wrong: ${error.message}`);
        setSubmitting(false);
      }
    },
    [brandId, push]
  );

  const initialValues: IFormValues = React.useMemo(
    () => ({
      name: "",
      startTime: null,
      endTime: null,
      creditMultiple: false,
      brandId: brandId || "LD",
      groupId: groupId ? Number(groupId) : undefined
    }),
    [brandId, groupId]
  );

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} validateOnMount>
      {({ values, submitForm, isSubmitting, isValid }) => (
        <StyledNewCampaign>
          <div className="back-button">
            <BackButton type="button" onClick={() => goBack()} />
          </div>

          <CampaignInfoForm values={values} disabled={isSubmitting} />

          <div>
            <Button icon={<Save />} type="submit" onClick={submitForm} disabled={isSubmitting || !isValid}>
              Save
            </Button>
          </div>
        </StyledNewCampaign>
      )}
    </Formik>
  );
};

export { NewCampaign };
