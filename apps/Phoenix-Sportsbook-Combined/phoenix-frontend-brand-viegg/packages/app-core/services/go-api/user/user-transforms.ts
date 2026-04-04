import type { GoUserProfile } from "./user-types";

export function transformGoUserProfileToSettingsData(profile: GoUserProfile) {
  return {
    userId: profile.user_id,
    username: profile.username,
    email: profile.email,
    status: profile.status,
    signUpDate: profile.sign_up_date || profile.created_at,
    hasToAcceptTerms:
      profile.has_to_accept_terms ?? profile.hasToAcceptTerms ?? false,
    hasToAcceptResponsibilityCheck:
      profile.has_to_accept_responsibility_check ??
      profile.hasToAcceptResponsibilityCheck ??
      false,
    name: {
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      title: "",
    },
  };
}
