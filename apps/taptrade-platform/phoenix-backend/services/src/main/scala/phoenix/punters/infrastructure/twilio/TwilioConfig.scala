package phoenix.punters.infrastructure.twilio

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class TwilioConfig(
    verificationServiceId: TwilioVerificationServiceId,
    accountServiceId: TwilioAccountServiceId,
    authToken: TwilioAuthToken,
    verifyApiBaseUrl: TwilioVerifyApiBaseUrl)

// scalastyle:off regex // to allow for AnyVal (need AnyVal otherwise automatic derivation fails)
final case class TwilioVerificationServiceId(value: String) extends AnyVal
final case class TwilioAccountServiceId(value: String) extends AnyVal
final case class TwilioAuthToken(value: String) extends AnyVal
final case class TwilioVerifyApiBaseUrl(value: String) extends AnyVal
// scalastyle:on

object TwilioConfig {
  object of extends BaseConfig[TwilioConfig]("twilio")
}
