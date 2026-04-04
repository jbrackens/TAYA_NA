/** GET /api/v1/users/{user_id} response. */
export interface GoUserProfile {
  user_id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  status: string;
  kyc_status: string;
  roles: string[];
  created_at: string;
  updated_at: string;
  sign_up_date?: string;
  has_to_accept_terms?: boolean;
  hasToAcceptTerms?: boolean;
  has_to_accept_responsibility_check?: boolean;
  hasToAcceptResponsibilityCheck?: boolean;
  twoFactorAuthEnabled?: boolean;
}

/** PUT /api/v1/users/{user_id} request body. */
export interface GoUpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: GoAddress;
}

export interface GoAddress {
  address_line?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
}

/** PUT /profile/preferences request body. */
export interface GoUpdatePreferencesRequest {
  communicationPreferences: {
    announcements: boolean;
    promotions: boolean;
    subscriptionUpdates: boolean;
    signInNotifications: boolean;
  };
  bettingPreferences: {
    autoAcceptBetterOdds: boolean;
  };
}
