package phoenix.keycloak

object KeycloakPunterAttributes {

  // KYC
  val AccountVerified = "account_verified"

  val Title = "title"
  val PhoneNumber = "phone"
  val SSN = "ssn"
  val Gender = "gender"

  // Address Keys
  val AddressLine = "address_line"
  val City = "city"
  val State = "state"
  val ZipCode = "zip_code"
  val Country = "country"

  // DateOfBirth Keys
  val DayOfBirth = "day_of_birth"
  val MonthOfBirth = "month_of_birth"
  val YearOfBirth = "year_of_birth"

  // Communication preferences
  val Announcements = "pref_announcements"
  val Promotions = "pref_promotions"
  val SubscriptionUpdates = "pref_subscription_updates"
  val SignInNotifications = "pref_sign_in_notifications"

  // Betting preferences
  val AutoAcceptBetterOdds = "pref_auto_accept_better_odds"

  // Sign Up details
  val SignUpDate = "sign_up_date"

  // Sign In
  val LastSignInTimestamp = "last_sign_in_timestamp"
  val LastSignInIpAddress = "last_sign_in_ip_address"
  val TwoFactorAuthEnabled = "pref_two_factor_auth_enabled"
  val IsPhoneNumberVerified = "is_phone_number_verified"

  // Terms agreement
  val TermsAcceptedAt = "terms_accepted_at"
  val TermsAcceptedVersionKey = "terms_accepted_version"

  // Registration
  val IsRegistrationVerified = "is_registration_verified"
}
