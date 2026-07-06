// ── Go Compliance / Responsible Gaming API Types ──

/** POST /punters/deposit-limits, /punters/stake-limits, /punters/session-limits */
export type GoSetLimitRequest = {
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
};

export type GoSetLimitResponse = {
  success: boolean;
  message?: string;
};

/** POST /punters/cool-off */
export type GoCoolOffRequest = {
  duration_days: number;
};

export type GoCoolOffResponse = {
  success: boolean;
  cool_off_end?: string;
};

/** POST /punters/self-exclude */
export type GoSelfExcludeRequest = {
  duration: "ONE_YEAR" | "FIVE_YEARS";
  verification_id?: string;
  verification_code?: string;
};

export type GoSelfExcludeResponse = {
  success: boolean;
};

/** GET /punters/limits-history */
export type GoLimitHistoryEntry = {
  id: string;
  limit_type: string;
  period: string;
  amount: number;
  effective_date: string;
  created_at: string;
};

export type GoLimitHistoryResponse = {
  data: GoLimitHistoryEntry[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
};

/** GET /punters/cool-offs-history */
export type GoCoolOffHistoryEntry = {
  id: string;
  cause: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type GoCoolOffHistoryResponse = {
  data: GoCoolOffHistoryEntry[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
};

/** PUT /responsibility-check/accept */
export type GoResponsibilityCheckResponse = {
  success: boolean;
};

/** GET /punters/current-session */
export type GoSessionInfo = {
  sessionStartTime: string;
  currentTime: string;
  device_id?: string;
  deviceFingerprint?: string;
  has_to_accept_responsibility_check?: boolean;
  hasToAcceptResponsibilityCheck?: boolean;
};

/** GET /geo-comply/license-key */
export type GoGeoComplyLicenseResponse = {
  value: string;
};

/** POST /geo-comply/geo-packet */
export type GoGeoComplyPacketRequest = {
  encryptedString: string;
};

export type GoGeoComplyTroubleshooterReason = {
  retry: boolean;
  message: string;
  helpLink?: string | null;
  optInLink?: string | null;
};

export type GoGeoComplyPacketResponse = {
  result: string;
  anotherGeolocationInSeconds: number;
  errors?: string[];
  reasons?: GoGeoComplyTroubleshooterReason[];
};
