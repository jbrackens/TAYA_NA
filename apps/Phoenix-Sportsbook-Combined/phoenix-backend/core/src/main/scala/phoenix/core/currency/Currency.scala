package phoenix.core.currency

import cats.data.Validated

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException

/**
 * Represents any currency, which might or might not be the default currency of the given deployment/brand.
 * Should be used to represent the money whenever the currency is uncertain - esp. for the customer money coming from the top-ups.
 */
sealed class AnyCurrency(val symbol: String) {
  override final def equals(other: Any): Boolean =
    other match {
      case c: AnyCurrency => this.symbol == c.symbol
      case _              => false
    }

  override final def hashCode(): Int = symbol.hashCode()

  override final def toString: String = symbol
}

object AnyCurrency {
  def apply(symbol: String): AnyCurrency = new AnyCurrency(symbol)

  def unapply(arg: AnyCurrency): Some[String] = Some(arg.symbol)
}

/**
 * Represents the default currency of the given deployment/brand.
 * Generally, all operations on money in the system should be performed on money normalized to this default currency.
 * Currently, it's hardcoded to USD; in the future this should be configurable on a per-deployment basis.
 */
sealed class DefaultCurrency extends AnyCurrency("USD")

object DefaultCurrency extends DefaultCurrency {
  def fromString(aSymbol: String): Validation[DefaultCurrency] =
    Validated.condNel(
      aSymbol == this.symbol,
      this,
      ValidationException(s"Unexpected currency symbol $aSymbol, should be ${this.symbol}"))
}
