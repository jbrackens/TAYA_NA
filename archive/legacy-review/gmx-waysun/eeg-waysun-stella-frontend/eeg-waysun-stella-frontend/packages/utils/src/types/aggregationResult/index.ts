export type AggregationResultObjectType = {
  position: number;
  groupByFieldValue: string;
  min: number;
  max: number;
  count: number;
  sum: number;
  custom: string;
  createdAt: string;
  updatedAt: string;
};

export type AggregationResultType = {
  pageNumber: number;
  numberOfPages: number;
  pageSize: number;
  results: Array<AggregationResultObjectType>;
};

export type AggregationResultResponseType = {
  status: string;
  results: AggregationResultType;
}

export type AggregationResultNeighborResponseType = {
  status: string;
  results: Array<AggregationResultType>;
}