import { FC, lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useAppSelector, authenticationSlice } from "@idefix-backoffice/idefix/store";
import { LoadingIndicator } from "@idefix-backoffice/idefix/components";

import { Bonuses } from "../modules/bonuses";
import { Campaigns } from "../modules/campaigns";
import { Documents } from "../modules/documents";
import { FraudTask } from "../modules/fraud-task";
import { History } from "../modules/history";
import { KycProcess } from "../modules/kyc-process";
import { Layout } from "../modules/layout";
import { Limits } from "../modules/limits";
import { Payments } from "../modules/payments";
import { Player } from "../modules/player";
import { PlayerInfo } from "../modules/player-info";
import { Promotions } from "../modules/promotions";
import { Rewards } from "../modules/rewards";
import { Risks } from "../modules/risks";
import { Transactions } from "../modules/transactions";
import { User } from "../modules/user";
import { WithdrawalTask } from "../modules/withdrawal-task";
import { Box } from "@mui/material";

const NotFoundPage = lazy(() => import("../pages/not-found"));
const PlayersPage = lazy(() => import("../pages/players"));
const ReportsPage = lazy(() => import("../pages/reports"));
const SettingsPage = lazy(() => import("../pages/settings"));
const UsersPage = lazy(() => import("../pages/users"));

const AppRoutes: FC = () => {
  const adminAccess = useAppSelector(authenticationSlice.getAdminAccess);
  const reportingAccess = useAppSelector(authenticationSlice.getReportingAccess);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/players" replace />} />

        <Route
          path="/players"
          element={
            <Suspense
              fallback={
                <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
                  <LoadingIndicator />
                </Box>
              }
            >
              <PlayersPage />
            </Suspense>
          }
        >
          <Route path=":playerId" element={<Player />}>
            <Route path="tasks">
              <Route path="kyc" element={<KycProcess />}>
                <Route path=":kycDocumentId" element={<KycProcess />} />
              </Route>
              <Route path="withdrawal/:withdrawalId" element={<WithdrawalTask />} />
              <Route path="fraud/:playerFraudId" element={<FraudTask />} />
            </Route>
            <Route path="player-info" element={<PlayerInfo />} />
            <Route path="documents" element={<Documents />} />
            <Route path="bonuses" element={<Bonuses />} />
            <Route path="history" element={<History />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="payments" element={<Payments />} />
            <Route path="limits" element={<Limits />} />
            <Route path="risks" element={<Risks />}>
              <Route path=":riskType" element={<Risks />} />
            </Route>
            <Route path="promotions" element={<Promotions />} />
            <Route path="rewards" element={<Rewards />}>
              <Route path=":groupId" element={<Rewards />} />
            </Route>
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="*" element={<Navigate to="player-info" />} />
          </Route>
        </Route>

        <Route
          path="/reports"
          element={
            reportingAccess ? (
              <Suspense
                fallback={
                  <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
                    <LoadingIndicator />
                  </Box>
                }
              >
                <ReportsPage />
              </Suspense>
            ) : (
              <Navigate to="/players" replace />
            )
          }
        >
          <Route path=":reportType" element={<ReportsPage />} />
        </Route>

        <Route
          path="/users"
          element={
            adminAccess ? (
              <Suspense
                fallback={
                  <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
                    <LoadingIndicator />
                  </Box>
                }
              >
                <UsersPage />
              </Suspense>
            ) : (
              <Navigate to="/players" replace />
            )
          }
        >
          <Route path=":userId" element={<User />} />
        </Route>

        <Route
          path="/settings"
          element={
            adminAccess ? (
              <Suspense
                fallback={
                  <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
                    <LoadingIndicator />
                  </Box>
                }
              >
                <SettingsPage />
              </Suspense>
            ) : (
              <Navigate to="/players" replace />
            )
          }
        >
          <Route path=":type" element={<SettingsPage />}>
            <Route path=":brandId" element={<SettingsPage />}>
              <Route path=":paymentMethodId" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Suspense
            fallback={
              <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
                <LoadingIndicator />
              </Box>
            }
          >
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  );
};

export { AppRoutes };
