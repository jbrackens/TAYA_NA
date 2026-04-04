import React, { ReactNode } from "react";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import PlayerStatus from "./components/PlayerStatus";
import PlayerNavigation from "./components/PlayerNavigation";
import CreateTaskMenu from "./components/CreateTaskMenu";
import { ActiveLimitOptions, PlayerAccountStatus, PlayerStatus as IPlayerStatus, PlayerWithUpdate } from "app/types";

interface Props {
  children: ReactNode;
  playerInfo?: PlayerWithUpdate;
  status?: IPlayerStatus;
  isFetchingStatus: boolean;
  activeLimits: ActiveLimitOptions | {};
  accountStatus: PlayerAccountStatus;
  playerId: number;
  kycDocuments: PlayerWithUpdate["kycDocuments"];
  withdrawals: PlayerWithUpdate["withdrawals"];
  fraudIds: PlayerWithUpdate["fraudIds"];
  tabValue: number;
  onAddTransaction: () => void;
  onCreditBonus: () => void;
  onAddPaymentAccount: () => void;
  onAddPlayerNote: () => void;
  onAddDocuments: () => void;
  onTaskClick: (taskType: string) => void;
  onChangeTab: (tab: string) => void;
  onChangeTabValue: (_e: any, newValue: number) => void;
  onRequestDocuments: () => void;
  onFetchActiveLimits: () => void;
  onFetchAccountStatus: () => void;
  onRegisterGambling: () => void;
  onTriggerManualTask: () => void;
}

const Component = ({
  children,
  playerInfo,
  status,
  isFetchingStatus,
  activeLimits,
  accountStatus,
  playerId,
  kycDocuments,
  withdrawals,
  fraudIds,
  tabValue,
  onAddTransaction,
  onCreditBonus,
  onAddPaymentAccount,
  onAddPlayerNote,
  onAddDocuments,
  onTaskClick,
  onChangeTab,
  onChangeTabValue,
  onRequestDocuments,
  onFetchActiveLimits,
  onFetchAccountStatus,
  onRegisterGambling,
  onTriggerManualTask,
}: Props) => (
  <Box display="flex" flexDirection="column" width={1}>
    <Box zIndex={1}>
      <Box>
        {playerInfo && (
          <PlayerStatus
            brandId={playerInfo.brandId}
            firstName={playerInfo.firstName}
            lastName={playerInfo.lastName}
            username={playerInfo.username}
            balance={status?.balance}
            isFetchingStatus={isFetchingStatus}
            activeLimits={activeLimits}
            accountVerified={accountStatus.verified}
            loginBlocked={accountStatus.loginBlocked}
            allowTransactions={accountStatus.allowTransactions}
            accountClosed={accountStatus.accountClosed}
            accountSuspended={accountStatus.accountSuspended}
            gamblingProblem={accountStatus.gamblingProblem}
            potentialGamblingProblem={accountStatus.potentialGamblingProblem}
            documentsRequested={accountStatus.documentsRequested}
            riskProfile={accountStatus.riskProfile}
            ddPending={accountStatus.ddPending}
            ddMissing={accountStatus.ddMissing}
            playerId={playerId}
            onFetchActiveLimits={onFetchActiveLimits}
            onFetchAccountStatus={onFetchAccountStatus}
          />
        )}
        <PlayerNavigation
          tabValue={tabValue}
          balance={status?.balance}
          kycDocuments={kycDocuments}
          withdrawals={withdrawals}
          fraudIds={fraudIds}
          onTaskClick={onTaskClick}
          onChangeTab={onChangeTab}
          onChangeTabValue={onChangeTabValue}
        />
      </Box>
      <Divider light />
    </Box>
    <Box position="relative" height="100%" style={{ overflowY: "scroll" }}>
      {children}
      <Box position="fixed" right={16} bottom={16} zIndex={1}>
        <CreateTaskMenu
          onAddTransaction={onAddTransaction}
          onCreditBonus={onCreditBonus}
          onAddPaymentAccount={onAddPaymentAccount}
          onAddPlayerNote={onAddPlayerNote}
          onAddDocuments={onAddDocuments}
          onRequestDocuments={onRequestDocuments}
          onRegisterGambling={onRegisterGambling}
          onTriggerManualTask={onTriggerManualTask}
        />
      </Box>
    </Box>
  </Box>
);

export default Component;
