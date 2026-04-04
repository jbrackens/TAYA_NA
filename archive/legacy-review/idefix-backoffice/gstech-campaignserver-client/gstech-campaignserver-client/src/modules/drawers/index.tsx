import * as React from "react";

import { useGetDrawerState, useCloseDrawer } from "../../hooks";
import AddRewardRule from "../campaign-reward/AddRewardRule";
import EditRewardRule from "../campaign-reward/EditRewardRule";
import EmailPreview from "../campaign-email/EmailPreview";
import SmsPreview from "../campaign-sms/SmsPreview";
import NotificationPreview from "../campaign-notification/NotificationPreview";
import { AddReward, EditReward } from "../../pages/Rewards";
import { AddGame, EditGame, CopyGame } from "../../pages/Games";
import { Drawer } from "../../components";
import { DRAWERS } from "../../utils/constants";

const drawers = {
  [DRAWERS.addRewardRule]: AddRewardRule,
  [DRAWERS.editRewardRule]: EditRewardRule,
  [DRAWERS.emailPreview]: EmailPreview,
  [DRAWERS.smsPreview]: SmsPreview,
  [DRAWERS.notificationPreview]: NotificationPreview,
  [DRAWERS.addReward]: AddReward,
  [DRAWERS.editReward]: EditReward,
  [DRAWERS.addGame]: AddGame,
  [DRAWERS.editGame]: EditGame,
  [DRAWERS.copyGame]: CopyGame
};

const Drawers = () => {
  const { mountedDrawer, isOpened } = useGetDrawerState();
  const DrawerContent = !!mountedDrawer && drawers[mountedDrawer];
  const onClose = useCloseDrawer();

  if (!DrawerContent) {
    return null;
  }

  return (
    <Drawer open={isOpened} onClose={onClose}>
      <DrawerContent onClose={onClose} />
    </Drawer>
  );
};

export default Drawers;
