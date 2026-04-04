export type RequestDocumentsFormValues = {
  requestAutomatically: boolean;
  note?: string;
  message?: string;
  identification: boolean;
  utility_bill: boolean;
  verification: boolean;
  payment_method?: number[];
  source_of_wealth: boolean;
};
