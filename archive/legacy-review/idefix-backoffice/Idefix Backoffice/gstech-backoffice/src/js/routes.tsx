import React, { FC } from "react";
import { useSelector } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { App, Players, Users } from "./modules/app";
import { ReportsContainer } from "./modules/reports";
import { getAdminAccess, getReportingAccess } from "./modules/authentication";
import { UserInfoContainer } from "./modules/user-info";
import NotFound from "./core/components/NotFound";
import { SettingsContainer } from "./modules/settings";
import { PlayerContainer } from "./modules/player";
import { PaymentsContainer } from "./modules/payments";
import { PlayerInfoContainer } from "./modules/player-info";
import { BonusesContainer } from "./modules/bonuses";
import { HistoryAndNotesContainer } from "./modules/history-and-notes";
import { TransactionsContainer } from "./modules/transactions";
import { LimitsContainer } from "./modules/limits";
import { PromotionsContainer } from "./modules/promotions";
import { DocumentsContainer } from "./modules/documents";
import { RewardsContainer } from "./modules/rewards";
import { CampaignsTabContainer } from "./modules/campaigns-tab";
import { KycProcessContainer } from "./modules/kyc-process";
import { WithdrawalTaskContainer } from "./modules/withdrawal-task";
import { FraudTaskContainer } from "./modules/fraud-task";
import { RisksContainer } from "./modules/risks";
import { PredictionOpsContainer } from "./modules/prediction-ops";

const AppRoutes: FC = () => {
  const adminAccess = useSelector(getAdminAccess);
  const reportingAccess = useSelector(getReportingAccess);

  return (
    <Routes>
      <Route element={<App />}>
        <Route path="/" element={<Navigate to="/players" />} />

        <Route path="/reports" element={reportingAccess ? <ReportsContainer /> : <Navigate to="/players" />}>
          <Route path=":reportType" element={<ReportsContainer />} />
        </Route>

        <Route path="/prediction-ops" element={adminAccess ? <PredictionOpsContainer /> : <Navigate to="/players" />} />

        <Route path="/users" element={adminAccess ? <Users /> : <Navigate to="/players" />}>
          <Route path="@:userId" element={<UserInfoContainer />} />
        </Route>

        <Route path="/settings" element={adminAccess ? <SettingsContainer /> : <Navigate to="/players" />}>
          <Route path=":type" element={<SettingsContainer />}>
            <Route path=":brandId" element={<SettingsContainer />}>
              <Route path=":paymentMethodId" element={<SettingsContainer />} />
            </Route>
          </Route>
        </Route>

        <Route path="/players" element={<Players />}>
          <Route path="@:playerId" element={<PlayerContainer />}>
            <Route path="tasks">
              <Route path="kyc" element={<KycProcessContainer />}>
                <Route path=":kycDocumentId" element={<KycProcessContainer />} />
              </Route>
              <Route path="withdrawal/:withdrawalId" element={<WithdrawalTaskContainer />} />
              <Route path="fraud/:playerFraudId" element={<FraudTaskContainer />} />
            </Route>
            <Route path="player-info" element={<PlayerInfoContainer />} />
            <Route path="documents" element={<DocumentsContainer />} />
            <Route path="bonuses" element={<BonusesContainer />} />
            <Route path="history-and-notes" element={<HistoryAndNotesContainer />} />
            <Route path="transactions" element={<TransactionsContainer />} />
            <Route path="payments" element={<PaymentsContainer />} />
            <Route path="limits" element={<LimitsContainer />} />
            <Route path="risks" element={<RisksContainer />}>
              <Route path=":riskType" element={<RisksContainer />} />
            </Route>
            <Route path="promotions" element={<PromotionsContainer />} />
            <Route path="rewards" element={<RewardsContainer />}>
              <Route path=":groupId" element={<RewardsContainer />} />
            </Route>
            <Route path="campaigns" element={<CampaignsTabContainer />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
