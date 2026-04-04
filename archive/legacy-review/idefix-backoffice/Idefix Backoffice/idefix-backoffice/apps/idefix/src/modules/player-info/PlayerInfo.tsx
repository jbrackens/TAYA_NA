import { FC } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

import { PlayerTags } from "../player-tags";
import { PlayerNote } from "../player-notes";
import { PlayerDetails } from "../player-details";
import { PlayerRegistrationInfo } from "../player-registration-info";
import { PlayerPromotionalInfo } from "../player-promotional-info";
import { Questionnaires } from "../questionnaires";

const PlayerInfo: FC = () => {
  return (
    <Box>
      <Stack spacing={4} divider={<Divider />}>
        <PlayerTags />
        <PlayerNote />
        <PlayerDetails />
        <PlayerRegistrationInfo />
        <PlayerPromotionalInfo />
        <Questionnaires />
      </Stack>
    </Box>
  );
};

export { PlayerInfo };
