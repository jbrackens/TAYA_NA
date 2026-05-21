"use client";

import styled from "styled-components";
import { Badge, Button, Card } from "../shared";
import { useState } from "react";

const ProfileContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled(Card)`
  padding: 20px;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--focus-ring, #0e7a53) 0%,
    #2e5cb8 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t1, #1a1a1a);
  font-weight: 700;
  font-size: 24px;
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const Name = styled.h2`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--t1, #1a1a1a);
`;

const Email = styled.p`
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--t2, #4a4a4a);
`;

const BadgeGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-1, #e5dfd2);

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  color: var(--t2, #4a4a4a);
  font-size: 12px;
`;

const InfoValue = styled.span`
  color: var(--t1, #1a1a1a);
  font-weight: 600;
  font-size: 13px;
`;

const TabsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  padding: 12px;
  background-color: ${(props) =>
    props.$active ? "var(--focus-ring, #0e7a53)" : "var(--border-1, #e5dfd2)"};
  color: ${(props) =>
    props.$active ? "var(--bg-deep, #f7f3ed)" : "var(--t2, #4a4a4a)"};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${(props) =>
      props.$active ? "var(--focus-ring, #0e7a53)" : "rgba(74, 126, 255, 0.2)"};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
`;

const ContentArea = styled(Card)`
  padding: 20px;
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
`;

const TabContent = styled.div`
  color: var(--t2, #4a4a4a);
`;

export interface PunterProfileData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: "active" | "suspended" | "inactive";
  verificationStatus: "verified" | "pending" | "failed";
  balance: number;
  portfolioValue: number;
  totalPredictions: number;
  openPositions: number;
  accuracyPct: number;
  pnl: number;
  unrealizedPnl: number;
}

export interface SettlementRow {
  id: string;
  marketId: string;
  side: string;
  quantity: number;
  pnlCents: number;
  payoutCents: number;
  paidAt: string;
}

export interface WalletLedgerRow {
  entryId: string;
  type: string;
  amountCents: number;
  balanceCents: number;
  reason?: string;
  transactionTime: string;
}

interface PunterProfileProps {
  punter?: PunterProfileData;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  actionsAvailable?: boolean;
  settlements?: SettlementRow[];
  walletLedger?: WalletLedgerRow[];
}

const money = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const cents = (c: number) => `$${money(c / 100)}`;
const signedCents = (c: number) =>
  `${c < 0 ? "-" : "+"}$${money(Math.abs(c) / 100)}`;
const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleString() : "—");

const HistTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;
const HistTh = styled.th`
  text-align: left;
  padding: 8px 10px;
  color: var(--t2, #4a4a4a);
  border-bottom: 1px solid var(--border-1, #e5dfd2);
  font-weight: 600;
  white-space: nowrap;
`;
const HistTd = styled.td`
  padding: 8px 10px;
  color: var(--t1, #1a1a1a);
  border-bottom: 1px solid var(--border-1, #e5dfd2);
  white-space: nowrap;
`;

export function PunterProfile({
  punter,
  onAction,
  actionsAvailable = true,
  settlements = [],
  walletLedger = [],
}: PunterProfileProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!punter) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--t2, #4a4a4a)",
        }}
      >
        Select a punter to view profile
      </div>
    );
  }

  const initials = punter.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const statusColor = {
    active: "success",
    suspended: "danger",
    inactive: "default",
  } as const;

  const verificationColor = {
    verified: "success",
    pending: "warning",
    failed: "danger",
  } as const;
  const canSuspend = actionsAvailable && punter.status !== "suspended";
  const canActivate = actionsAvailable && punter.status === "suspended";

  return (
    <ProfileContainer>
      <div>
        <InfoCard>
          <ProfileHeader>
            <Avatar>{initials}</Avatar>
            <HeaderInfo>
              <Name>{punter.name}</Name>
              <Email>{punter.email}</Email>
              <BadgeGroup>
                <Badge $variant={statusColor[punter.status]}>
                  {punter.status.toUpperCase()}
                </Badge>
                <Badge $variant={verificationColor[punter.verificationStatus]}>
                  {punter.verificationStatus.toUpperCase()}
                </Badge>
              </BadgeGroup>
            </HeaderInfo>
          </ProfileHeader>

          <InfoRow>
            <InfoLabel>Member Since</InfoLabel>
            <InfoValue>
              {new Date(punter.createdAt).toLocaleDateString()}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Wallet Balance</InfoLabel>
            <InfoValue>${money(punter.balance)}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Portfolio Value</InfoLabel>
            <InfoValue>${money(punter.portfolioValue)}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Open Positions</InfoLabel>
            <InfoValue>{punter.openPositions.toLocaleString()}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Total Predictions</InfoLabel>
            <InfoValue>{punter.totalPredictions.toLocaleString()}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Accuracy</InfoLabel>
            <InfoValue>{punter.accuracyPct.toFixed(1)}%</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Realized P&L</InfoLabel>
            <InfoValue
              style={{
                color:
                  punter.pnl >= 0
                    ? "var(--accent-lo, #1fa65e)"
                    : "var(--no-text, #a8472d)",
              }}
            >
              {punter.pnl < 0 ? "-" : "+"}${money(Math.abs(punter.pnl))}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Unrealized P&L</InfoLabel>
            <InfoValue
              style={{
                color:
                  punter.unrealizedPnl >= 0
                    ? "var(--accent-lo, #1fa65e)"
                    : "var(--no-text, #a8472d)",
              }}
            >
              {punter.unrealizedPnl < 0 ? "-" : "+"}$
              {money(Math.abs(punter.unrealizedPnl))}
            </InfoValue>
          </InfoRow>

          <ActionButtons>
            <Button
              variant="secondary"
              onClick={() =>
                onAction?.(
                  punter.status === "suspended" ? "activate" : "suspend",
                )
              }
              disabled={!canSuspend && !canActivate}
            >
              {punter.status === "suspended"
                ? "Activate Account"
                : "Suspend Account"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onAction?.("resetPassword")}
              disabled={true}
            >
              Force Password Reset
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const content = window.prompt(
                  "Add an admin note for this punter:",
                );
                if (content && content.trim()) {
                  onAction?.("addNote", { content: content.trim() });
                }
              }}
              disabled={!actionsAvailable}
            >
              Add Note
            </Button>
          </ActionButtons>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "var(--t2, #4a4a4a)",
              lineHeight: 1.5,
            }}
          >
            {actionsAvailable
              ? "Suspend, activate, and admin notes are live. Force password reset is awaiting auth-service support."
              : "Admin account mutations are read-only here until the Go backoffice mutation routes are implemented."}
          </div>
        </InfoCard>
      </div>

      <div>
        <InfoCard>
          <TabsContainer>
            <TabButton
              $active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </TabButton>
            <TabButton
              $active={activeTab === "bets"}
              onClick={() => setActiveTab("bets")}
            >
              Trade History
            </TabButton>
            <TabButton
              $active={activeTab === "wallet"}
              onClick={() => setActiveTab("wallet")}
            >
              Wallet
            </TabButton>
          </TabsContainer>
        </InfoCard>

        <ContentArea>
          {activeTab === "overview" && (
            <TabContent>
              <h4 style={{ color: "var(--t1, #1a1a1a)", marginTop: 0 }}>
                Account Overview
              </h4>
              <p>
                Detailed account information and activity logs would be
                displayed here.
              </p>
            </TabContent>
          )}
          {activeTab === "bets" && (
            <TabContent>
              <h4 style={{ color: "var(--t1, #1a1a1a)", marginTop: 0 }}>
                Trade History
              </h4>
              {settlements.length === 0 ? (
                <p>No settled trades yet.</p>
              ) : (
                <HistTable>
                  <thead>
                    <tr>
                      <HistTh>Market</HistTh>
                      <HistTh>Side</HistTh>
                      <HistTh>Qty</HistTh>
                      <HistTh>P&L</HistTh>
                      <HistTh>Payout</HistTh>
                      <HistTh>Settled</HistTh>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.id}>
                        <HistTd>{s.marketId.slice(0, 8)}</HistTd>
                        <HistTd>{s.side.toUpperCase()}</HistTd>
                        <HistTd>{s.quantity.toLocaleString()}</HistTd>
                        <HistTd
                          style={{
                            color:
                              s.pnlCents < 0
                                ? "var(--no-text, #a8472d)"
                                : "var(--accent-lo, #1fa65e)",
                          }}
                        >
                          {signedCents(s.pnlCents)}
                        </HistTd>
                        <HistTd>{cents(s.payoutCents)}</HistTd>
                        <HistTd>{fmtDate(s.paidAt)}</HistTd>
                      </tr>
                    ))}
                  </tbody>
                </HistTable>
              )}
            </TabContent>
          )}
          {activeTab === "wallet" && (
            <TabContent>
              <h4 style={{ color: "var(--t1, #1a1a1a)", marginTop: 0 }}>
                Wallet & Transactions
              </h4>
              {walletLedger.length === 0 ? (
                <p>No wallet transactions yet.</p>
              ) : (
                <HistTable>
                  <thead>
                    <tr>
                      <HistTh>Type</HistTh>
                      <HistTh>Amount</HistTh>
                      <HistTh>Balance</HistTh>
                      <HistTh>Reason</HistTh>
                      <HistTh>Time</HistTh>
                    </tr>
                  </thead>
                  <tbody>
                    {walletLedger.map((e) => (
                      <tr key={e.entryId}>
                        <HistTd>{e.type}</HistTd>
                        <HistTd
                          style={{
                            color:
                              e.type.toLowerCase() === "debit"
                                ? "var(--no-text, #a8472d)"
                                : "var(--accent-lo, #1fa65e)",
                          }}
                        >
                          {e.type.toLowerCase() === "debit" ? "-" : "+"}$
                          {money(Math.abs(e.amountCents) / 100)}
                        </HistTd>
                        <HistTd>{cents(e.balanceCents)}</HistTd>
                        <HistTd>{e.reason || "—"}</HistTd>
                        <HistTd>{fmtDate(e.transactionTime)}</HistTd>
                      </tr>
                    ))}
                  </tbody>
                </HistTable>
              )}
            </TabContent>
          )}
        </ContentArea>
      </div>
    </ProfileContainer>
  );
}
