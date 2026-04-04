package stella.wallet.routes.error

import ca.mrvisser.sealerate

import stella.common.http.error.PresentationErrorCode

sealed trait AdditionalPresentationErrorCode extends PresentationErrorCode

object AdditionalPresentationErrorCode {
  val values: Set[AdditionalPresentationErrorCode] = sealerate.values[AdditionalPresentationErrorCode]

  case object CurrencyNotFound extends AdditionalPresentationErrorCode {
    override val value: String = "currencyNotFound"
  }

  case object ProjectCurrencyNotFound extends AdditionalPresentationErrorCode {
    override val value: String = "projectCurrencyNotFound"
  }

  case object InsufficientFunds extends AdditionalPresentationErrorCode {
    override val value: String = "insufficientFunds"
  }
}
