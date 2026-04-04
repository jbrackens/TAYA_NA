import React from "react";
import Box from "@material-ui/core/Box";
import { TagsContainer } from "../tags";
import { PlayerDetailsContainer } from "../player-details";
import { QuestionnairesContainer } from "../questionnaires";
import Promotions from "./components/Promotions";
import RegistrationInfo from "./components/RegistrationInfo";
import StickyNote from "./components/StickyNote";
import { ActiveLimitOptions, PlayerDraft, PlayerRegistrationInfo } from "app/types";
import Divider from "@material-ui/core/Divider";
import { Typography } from "@material-ui/core";

interface Props {
  playerId: number;
  promotions?: { allowEmailPromotions: boolean; allowSMSPromotions: boolean; activated: boolean; testPlayer: boolean };
  activeLimits: ActiveLimitOptions;
  registrationInfo: PlayerRegistrationInfo;
  stickyNote: string;
  isFetchingStickyNote: boolean;
  isFetchingRegistrationInfo: boolean;
  isSavingStickyNote: boolean;
  onToggle: (type: keyof PlayerDraft) => (e: any, value: any) => void;
  onUpdateStickyNote: (content: any) => void;
  isAccountClosed: boolean;
  roles?: string[];
}

export default ({
  playerId,
  promotions,
  activeLimits,
  registrationInfo,
  stickyNote,
  isFetchingStickyNote,
  isFetchingRegistrationInfo,
  isSavingStickyNote,
  onToggle,
  onUpdateStickyNote,
  isAccountClosed,
  roles,
}: Props) => (
  <Box p={3}>
    <Typography variant="subtitle2">Tags</Typography>

    <Box mt={3}>
      <TagsContainer playerId={playerId} />
    </Box>

    <Box mt={3}>
      <Divider variant="fullWidth" />
    </Box>

    <Box mt={3}>
      <StickyNote
        isFetching={isFetchingStickyNote}
        isSaving={isSavingStickyNote}
        stickyNote={stickyNote as string}
        onUpdateStickyNote={onUpdateStickyNote}
      />
    </Box>

    <Box mt={3}>
      <Divider variant="fullWidth" />
    </Box>

    <Box mt={3}>
      <PlayerDetailsContainer playerId={playerId} />
    </Box>

    <Box mt={3}>
      <Divider variant="fullWidth" />
    </Box>

    <Box display="flex" mt={3}>
      <Box paddingRight="12px" width="70%">
        <RegistrationInfo registrationInfo={registrationInfo} isLoading={isFetchingRegistrationInfo} />
      </Box>

      <Box paddingLeft="12px" width="30%">
        <Promotions
          promotions={promotions}
          activeLimits={activeLimits}
          onToggle={onToggle}
          isAccountClosed={isAccountClosed}
          roles={roles}
        />
      </Box>
    </Box>

    <Box mt={3}>
      <Divider variant="fullWidth" />
    </Box>

    <QuestionnairesContainer playerId={playerId} />
  </Box>
);
