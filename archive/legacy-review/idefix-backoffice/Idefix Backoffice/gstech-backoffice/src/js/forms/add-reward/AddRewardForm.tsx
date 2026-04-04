import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import TextField from "../formik-fields/TextField";
import AutoCompleteField from "../formik-fields/AutoCompleteField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

interface Props {
  rewards: {
    title: string;
    id: number;
    rewardDefinitionId: number | null;
    creditType: string;
    bonusCode: string;
    externalId: string;
    cost: number;
    currency: null;
    description: string;
    gameId: number;
    metadata: {};
  }[];
  isOneReward: boolean;
}

const AddRewardForm = ({ rewards, isOneReward }: Props) =>
  rewards && (
    <Form>
      <Box display="flex" flexDirection="column" width="400px" height="400px">
        <Field component={ErrorMessageField} />
        {!isOneReward && (
          <Field
            name="rewardId"
            label="Reward"
            placeholder="Search reward"
            options={rewards}
            optionsConfig={{ text: "title", value: "id" }}
            component={AutoCompleteField}
          />
        )}
        <Field name="count" label="Number of rewards credited" type="number" fullWidth component={TextField} />
        <Field name="comment" label="Note" multiline fullWidth component={TextField} />
      </Box>
    </Form>
  );
export default AddRewardForm;
