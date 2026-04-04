import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";

import { TextField } from "../formik-fields/TextField";
import { AutoCompleteField } from "../formik-fields/AutoCompleteField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

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
    metadata: Record<string, unknown>;
  }[];
  isOneReward: boolean;
}

const AddRewardForm: FC<Props> = ({ rewards, isOneReward }) =>
  rewards && (
    <Form>
      <Box display="flex" flexDirection="column" width="400px" height="400px">
        <Field component={ErrorMessageField} />
        {!isOneReward && (
          <Box mt={1} mb={2}>
            <Field
              name="rewardId"
              label="Reward"
              placeholder="Search reward"
              options={rewards}
              optionsConfig={{ text: "title", value: "id" }}
              component={AutoCompleteField}
            />
          </Box>
        )}
        <Field name="count" label="Number of rewards credited" type="number" fullWidth component={TextField} />
        <Field name="comment" label="Note" multiline fullWidth component={TextField} />
      </Box>
    </Form>
  );

export { AddRewardForm };
