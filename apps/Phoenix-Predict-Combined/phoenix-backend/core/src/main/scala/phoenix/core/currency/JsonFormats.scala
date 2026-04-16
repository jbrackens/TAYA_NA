package phoenix.core.currency

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

import phoenix.core.JsonFormats._

object JsonFormats {
  implicit val defaultCurrencyCodec: Codec[DefaultCurrency] =
    Codec[String].bimapValidated(_.symbol, DefaultCurrency.fromString)

  implicit val defaultCurrencyMoneyCodec: Codec[DefaultCurrencyMoney] = deriveCodec

  implicit val moneyAmountCodec: Codec[MoneyAmount] = Codec[BigDecimal].bimap(_.amount, MoneyAmount.apply)

  implicit def positiveAmountCodec[T: Zero: Ordering: Codec]: Codec[PositiveAmount[T]] =
    Codec[T].bimapValidated(_.value, PositiveAmount.ensure[T])
}
