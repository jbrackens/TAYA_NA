package phoenix.bets.infrastructure.http

import sttp.tapir.Schema

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.DefaultCurrency

object BetTapirSchemas {

  implicit val betIdSchema: Schema[BetId] = Schema.string

  implicit val DefaultCurrencySchema: Schema[DefaultCurrency] = Schema.string

}
