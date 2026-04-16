export interface GoPredictionOrder {
  orderId: string;
  marketId: string;
  marketTitle: string;
  categoryLabel: string;
  outcomeId: string;
  outcomeLabel: string;
  priceCents: number;
  stakeUsd: number;
  shares: number;
  maxPayoutUsd: number;
  status: string;
  createdAt: string;
  settledAt?: string;
  settlementReason?: string;
  settlementActor?: string;
  previousSettlementStatus?: string;
  previousSettledAt?: string;
  previousSettledAmountUsd?: number;
  winningOutcomeLabel?: string;
  marketStatus?: string;
}

export interface GoPredictionOrdersResponse {
  orders: GoPredictionOrder[];
  totalCount: number;
}

export interface GoPredictionPlaceOrderRequest {
  marketId: string;
  outcomeId: string;
  stakeUsd: number;
}

export interface GoPredictionPlaceOrderResponse {
  orderId: string;
  status: string;
}

export interface GoPredictionCancelOrderResponse {
  orderId: string;
  status: string;
}
