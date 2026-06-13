package phoenix.core.currency

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

import phoenix.core.JsonFormats._

object CurrencyJsonFormats {
  implicit val defaultCurrencyCodec: Codec[DefaultCurrency] =
    Codec[String].bimapValidated(_.symbol, DefaultCurrency.fromString)

  implicit val defaultCurrencyMoneyCodec: Codec[DefaultCurrencyMoney] = deriveCodec
}
