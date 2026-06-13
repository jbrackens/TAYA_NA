package phoenix.bets.infrastructure

import phoenix.bets.BetValidator
import phoenix.bets.BetValidator.BetValidationError
import phoenix.core.error.PresentationErrorCode
import phoenix.wallets.WalletsBoundedContextProtocol

object BetValidationErrorMapping {
  def betValidationErrorToString(betValidationError: BetValidationError): String =
    betValidationError match {
      case BetValidator.PunterDoesNotExist(_)       => PresentationErrorCode.PunterProfileDoesNotExist.value
      case BetValidator.PunterCannotBetError(_)     => PresentationErrorCode.PunterCannotBet.value
      case BetValidator.StakeTooHigh(_)             => PresentationErrorCode.StakeTooHigh.value
      case BetValidator.MarketDoesNotExist(_)       => PresentationErrorCode.MarketNotFound.value
      case BetValidator.MarketNotBettable(_)        => PresentationErrorCode.MarketNotBettable.value
      case BetValidator.SelectionDoesNotExist(_, _) => PresentationErrorCode.SelectionNotFound.value
      case BetValidator.OddsHaveChangedError(_, _)  => PresentationErrorCode.SelectionOddsHaveChanged.value
      case BetValidator.WalletReservationError(error) =>
        error match {
          case WalletsBoundedContextProtocol.InsufficientFundsError(_) => PresentationErrorCode.InsufficientFunds.value
          case WalletsBoundedContextProtocol.WalletNotFoundError(_)    => PresentationErrorCode.WalletNotFound.value
          case WalletsBoundedContextProtocol.ReservationAlreadyExistsError(_, _) =>
            PresentationErrorCode.ReservationAlreadyExists.value
        }
      case BetValidator.GeolocationNotAllowed(_) => PresentationErrorCode.GeolocationNotAllowed.value
    }
}
