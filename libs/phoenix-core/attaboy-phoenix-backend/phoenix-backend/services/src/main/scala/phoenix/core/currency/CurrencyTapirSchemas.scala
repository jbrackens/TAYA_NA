package phoenix.core.currency

import sttp.tapir.Schema

object CurrencyTapirSchemas {

  implicit val defaultCurrencySchema: Schema[DefaultCurrency] = Schema.string

}
