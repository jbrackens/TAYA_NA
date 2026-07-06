// ── Go Terms & Conditions API Types ──

/** GET /terms, GET /terms/current */
export type GoTermsResponse = {
  content: string;
  version: string;
  updated_at?: string;
  current_terms_version?: string;
  currentTermsVersion?: string;
  terms_content?: string;
  termsContent?: string;
};

/** PUT /terms/accept */
export type GoAcceptTermsRequest = {
  version: string;
};

export type GoAcceptTermsResponse = {
  success?: boolean;
  user_id?: string;
  userId?: string;
  has_to_accept_terms?: boolean;
  hasToAcceptTerms?: boolean;
  terms?: {
    accepted_at?: string;
    acceptedAt?: string;
    version?: string;
  };
};
