import React, { useCallback, useState } from "react";
import Mde from "../../core/components/mde";
import Box from "@material-ui/core/Box";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Button from "@material-ui/core/Button";
import { AccountStatusContainer } from "../account-status";
import { PlayerFraud } from "app/types";
import { marked } from "marked";
import Divider from "@material-ui/core/Divider";
import { Typography } from "@material-ui/core";
import { SOW_QUESTIONNAIRE_ANSWERS } from "js/core/constants";

interface Props {
  playerFraud?: PlayerFraud;
  playerId: number;
  onKeep: (resolution?: string) => void;
  onClear: (resolution?: string) => void;
}

export default ({ playerFraud, playerId, onKeep, onClear }: Props) => {
  const [resolution, setResolution] = useState("");

  const handleKeep = useCallback(() => onKeep(resolution), [onKeep, resolution]);
  const handleClear = useCallback(() => onClear(resolution), [onClear, resolution]);

  return (
    <Box p={3}>
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
                <Button color="primary" onClick={handleKeep}>
                  Confirm
                </Button>
              </Box>
              <Box ml={2}>
                <Button color="primary" onClick={handleClear}>
                  Clear
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box mt={3} paddingBottom={12}>
        <AccountStatusContainer playerId={playerId} />
      </Box>
    </Box>
  );
};
