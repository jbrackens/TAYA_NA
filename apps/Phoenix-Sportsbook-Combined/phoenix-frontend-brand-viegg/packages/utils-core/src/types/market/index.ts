import { Fixture } from "../fixture";
import { SelectionOdd } from "../common/odd";

export type MarketsFixture = Fixture & {
  markets: Market[];
  marketsTotalCount: number;
};

export type SingleMarketFixture = Fixture & {
  market: Market;
};

export type Market = {
  marketId: string[];
  marketName: string;
  selectionOdds: SelectionOdd[];
  currentLifecycle: MarketLifecycle;
};

export type MarketLifecycle = {
  changeReason: MarketLifecycleChangeReason;
  type: MarketLifecycleType;
};

interface MultipleSelectProps {
  reason: string;
  type: MarketLifecycleChangeReasonWithoutDataSupplierChangeType;
}

interface SingleSelectProps {
  type: MarketLifecycleChangeReasonTypeEnum.DATA_SUPPLIER_CHANGE;
}

export type MarketLifecycleChangeReason =
  | MultipleSelectProps
  | SingleSelectProps;

export enum MarketLifecycleChangeReasonTypeEnum {
  DATA_SUPPLIER_CHANGE = "DATA_SUPPLIER_CHANGE",
  DATA_SUPPLIER_PUSH = "DATA_SUPPLIER_PUSH",
  BACKOFFICE_CHANGE = "BACKOFFICE_CHANGE",
  BACKOFFICE_CANCELLATION = "BACKOFFICE_CANCELLATION",
  DATA_SUPPLIER_CANCELLATION = "DATA_SUPPLIER_CANCELLATION",
}

export type MarketLifecycleChangeReasonType =
  | MarketLifecycleChangeReasonTypeEnum.BACKOFFICE_CHANGE
  | MarketLifecycleChangeReasonTypeEnum.DATA_SUPPLIER_CHANGE
  | MarketLifecycleChangeReasonTypeEnum.DATA_SUPPLIER_PUSH
  | MarketLifecycleChangeReasonTypeEnum.BACKOFFICE_CANCELLATION
  | MarketLifecycleChangeReasonTypeEnum.DATA_SUPPLIER_CANCELLATION;

export type MarketLifecycleChangeReasonWithoutDataSupplierChangeType =
  | MarketLifecycleChangeReasonTypeEnum.BACKOFFICE_CHANGE
  | MarketLifecycleChangeReasonTypeEnum.BACKOFFICE_CANCELLATION
  | MarketLifecycleChangeReasonTypeEnum.DATA_SUPPLIER_CANCELLATION;

export type MarketLifecycleType =
  | MarketLifecycleTypeEnum.BETTABLE
  | MarketLifecycleTypeEnum.CANCELLED
  | MarketLifecycleTypeEnum.NOT_BETTABLE
  | MarketLifecycleTypeEnum.SETTLED
  | MarketLifecycleTypeEnum.RESETTLED;

export enum MarketLifecycleTypeEnum {
  BETTABLE = "BETTABLE",
  NOT_BETTABLE = "NOT_BETTABLE",
  SETTLED = "SETTLED",
  CANCELLED = "CANCELLED",
  RESETTLED = "RESETTLED",
}
