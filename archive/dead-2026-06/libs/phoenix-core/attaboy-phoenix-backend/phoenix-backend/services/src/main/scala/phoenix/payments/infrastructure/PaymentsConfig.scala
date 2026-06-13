package phoenix.payments.infrastructure

import pureconfig.ConfigReader
import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class PaymentsConfig(
    merchantId: MerchantId,
    shopId: ShopId,
    baseUrl: PxpBaseUrl,
    username: Username,
    password: Password,
    webhookUsername: Username,
    webhookPassword: Password) {

  def webhookCredentials: WebhookCredentials = WebhookCredentials(webhookUsername, webhookPassword)
}

final case class MerchantId(value: String)
final case class ShopId(value: String)
final case class Username(value: String)
final case class Password(value: String)
final case class PxpBaseUrl(value: String)
final case class WebhookCredentials(username: Username, password: Password)

object PaymentsConfig {

  implicit val merchantIdReader: ConfigReader[MerchantId] = ConfigReader[String].map(MerchantId)
  implicit val shopIdReader: ConfigReader[ShopId] = ConfigReader[String].map(ShopId)
  implicit val pxpBaseUrlReader: ConfigReader[PxpBaseUrl] = ConfigReader[String].map(PxpBaseUrl)
  implicit val usernameReader: ConfigReader[Username] = ConfigReader[String].map(Username)
  implicit val passwordReader: ConfigReader[Password] = ConfigReader[String].map(Password)

  object of extends BaseConfig[PaymentsConfig]("phoenix.pxp")
}
