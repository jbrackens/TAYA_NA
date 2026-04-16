package phoenix.punters

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig
import phoenix.core.emailing.EmailNotificationsConfig
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.TalonAppBaseUrl.TalonAppIndividualPunterUrl
import phoenix.punters.domain.Email

final case class NotificationsConfig(
    email: EmailNotificationsConfig,
    baseUrl: PhoenixAppBaseUrl,
    talonAppBaseUrl: TalonAppBaseUrl,
    customerSupportEmail: Email) {

  def customerSupportContext: CustomerSupportContext = CustomerSupportContext(talonAppBaseUrl, customerSupportEmail)
}

final case class CustomerSupportContext(talonAppBaseUrl: TalonAppBaseUrl, customerSupportEmail: Email) {
  def talonPunterUrlFor(punterId: PunterId): TalonAppIndividualPunterUrl =
    talonAppBaseUrl.urlFor(punterId)
}

final case class TalonAppBaseUrl(value: String) {
  def urlFor(punterId: PunterId): TalonAppIndividualPunterUrl =
    TalonAppIndividualPunterUrl(s"${value.stripSuffix("/")}/users/${punterId.value}")
}

object TalonAppBaseUrl {
  final case class TalonAppIndividualPunterUrl(value: String)
}

object NotificationsConfig {
  import ConfigCodecs._

  // `of` passes `EmailConfigReader` as a parameter to superclass (`BaseConfig`) constructor,
  // hence it needs to be declared AFTER `EmailConfigReader` itself
  // (implicits don't apply for members declared earlier in the same compilation module).
  object of extends BaseConfig[NotificationsConfig]("phoenix.notifications")
}
