import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import { marked } from "marked";
import { FC } from "react";

import { SOW_QUESTIONNAIRE_ANSWERS } from "@idefix-backoffice/idefix/utils";
import { Mde } from "@idefix-backoffice/idefix/components";
import { useFraudTask } from "./hooks";
import { AccountStatus } from "../account-status";

const FraudTask: FC = () => {
  const { playerFraud, handleClear, handleKeep, resolution, setResolution } = useFraudTask();
  return (
    <Box>
      {playerFraud && (
        <Box>
          <Typography variant="subtitle2">{playerFraud.title}</Typography>

          <Box mt={2}>
            <div dangerouslySetInnerHTML={{ __html: marked(playerFraud.description) }} />

            {playerFraud.details && (
              <Table>
                <TableBody>
                  {playerFraud.details.map(detail => (
                    <TableRow key={detail.key}>
                      <TableCell>{detail.key}</TableCell>
                      <TableCell>
                        {playerFraud.fraudKey.startsWith("lifetime_deposit_") &&
                        Object.keys(SOW_QUESTIONNAIRE_ANSWERS).includes(detail.value)
                          ? SOW_QUESTIONNAIRE_ANSWERS[detail.value as keyof typeof SOW_QUESTIONNAIRE_ANSWERS]
                          : detail.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {playerFraud.handle && <Typography variant="body2">Task created by {playerFraud.handle}.</Typography>}
            {playerFraud.content && <div dangerouslySetInnerHTML={{ __html: marked(playerFraud.content) }} />}

            <Box mt={2}>
              <Mde value={resolution} onChange={setResolution} />
            </Box>

            <Box display="flex" mt={2}>
              <Box>
                <Button onClick={() => handleKeep(resolution)}>Confirm</Button>
              </Box>
              <Box ml={2}>
                <Button onClick={() => handleClear(resolution)}>Clear</Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box mt={3} paddingBottom={12}>
        <AccountStatus />
      </Box>
    </Box>
  );
};

export { FraudTask };
