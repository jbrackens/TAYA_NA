package phoenix.dbviews.infrastructure

import java.time.Instant
import java.time.LocalDate

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import cats.data.EitherT
import cats.syntax.either._
import org.slf4j.Logger

import phoenix.CirceAkkaSerializable
import phoenix.core.Clock
import phoenix.core.currency.Amount
import phoenix.core.currency.MoneyAmount
import phoenix.dbviews.domain.model.AccountStatus
import phoenix.dbviews.domain.model.AccountType
import phoenix.dbviews.domain.model.Adjustment
import phoenix.dbviews.domain.model.ExclusionReason
import phoenix.dbviews.domain.model.PatronStatus
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PunterStatus
import phoenix.punters.domain.SuspensionEntity
import phoenix.wallets.WalletActorProtocol.events

class View09PatronStatusProjectionHandler(
    punters: PuntersBoundedContext,
    repository: SlickView09PatronStatusRepository,
    clock: Clock,
    log: Logger)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[CirceAkkaSerializable] {
  override def process(envelope: EventEnvelope[CirceAkkaSerializable]): Future[Done] = {
    val reportingDate = LocalDate.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    envelope.event match {
      case event: PunterEvent =>
        log.info(s"Handling punter event $event")
        punterEvent(event, reportingDate)
      case event: events.TransactionEvent =>
        log.info(s"Handling wallet event $event")
        walletEvent(event, reportingDate)
      case _ => Future.successful(Done)
    }
  }

  private def punterEvent(event: PunterEvent, reportingDate: LocalDate): Future[Done] =
    EitherT
      .right(repository.findLatest(event.punterId))
      .flatMap(
        patronStatusOpt =>
          punters
            .getPunterProfile(event.punterId)
            .map(createPatronStatus(_, reportingDate))
            .map(status =>
              status.copy(
                walletBalance = patronStatusOpt.map(_.walletBalance).getOrElse(status.walletBalance),
                blockedFunds = patronStatusOpt.map(_.blockedFunds).getOrElse(status.blockedFunds),
                fundsOnGame = patronStatusOpt.map(_.fundsOnGame).getOrElse(status.fundsOnGame),
                adjustment = patronStatusOpt.map(_.adjustment).getOrElse(status.adjustment))))
      .flatMap(patronStatus =>
        EitherT.right[PuntersBoundedContext.PunterProfileDoesNotExist](repository.upsert(patronStatus)))
      .fold(_ => Done, _ => Done)
  private def walletEvent(event: events.TransactionEvent, reportingDate: LocalDate): Future[Done] = {
    val punterId = event.walletId.owner
    val transaction = event.transaction
    val balance = transaction.currentBalance
    val adjustment: Amount = event match {
      case _: events.AdjustingFundsDeposited =>
        transaction.amount.amount
      case _: events.AdjustingFundsWithdrawn =>
        -transaction.amount.amount
      case _: events.BetCancelled | _: events.BetLost | _: events.BetPushed | _: events.BetResettled |
          _: events.BetVoided | _: events.BetWon | _: events.FundsDeposited | _: events.FundsReservedForBet |
          _: events.FundsReservedForPrediction | _: events.FundsReservedForWithdrawal | _: events.FundsWithdrawn |
          _: events.PredictionCancelled | _: events.PredictionLost | _: events.PredictionPushed |
          _: events.PredictionResettled | _: events.PredictionVoided | _: events.PredictionWon |
          _: events.WithdrawalCancelled | _: events.WithdrawalConfirmed =>
        0
    }
    EitherT
      .right(repository.findLatest(punterId))
      .flatMap {
        case None => punters.getPunterProfile(punterId).map(createPatronStatus(_, reportingDate))
        case Some(patronStatus) =>
          patronStatus
            .copy(reportingDate = reportingDate)
            .asRight
            .toEitherT: EitherT[Future, PuntersBoundedContext.PunterProfileDoesNotExist, PatronStatus]
      }
      .flatMap { patronStatus =>
        val blockedFunds = Some(balance.blocked.blockedForWithdrawals).filter(blocked => blocked.amount != 0)
        val fundsOnGame = Some(balance.blocked.blockedForBets).filter(blocked => blocked.amount != 0)
        val fundsAdjustment =
          if (adjustment == 0) patronStatus.adjustment
          else {
            val moneyAdjustment = patronStatus.adjustment.map(_.amount).getOrElse(MoneyAmount.zero.get)
            Some(Adjustment(moneyAdjustment + MoneyAmount(adjustment), "OPERATOR_ADJUSTMENT"))
          }
        EitherT.right[PuntersBoundedContext.PunterProfileDoesNotExist](
          repository.upsert(
            patronStatus.copy(
              walletBalance = balance.available,
              blockedFunds = blockedFunds,
              fundsOnGame = fundsOnGame,
              adjustment = fundsAdjustment)))
      }
      .fold(_ => Done, _ => Done)
  }
  private def createPatronStatus(punter: PunterProfile, reportingDate: LocalDate): PatronStatus =
    PatronStatus(
      punterId = punter.punterId,
      reportingDate = reportingDate,
      accountType = punterAccountType(punter),
      accountStatus = punterAccountStatus(punter),
      exclusionReason = punterExclusionReason(punter),
      walletBalance = MoneyAmount.zero.get,
      blockedFunds = None,
      fundsOnGame = None,
      adjustment = None)
  private def punterAccountType(punter: PunterProfile): AccountType =
    if (punter.isTestAccount) AccountType.Test else AccountType.Real
  private def punterAccountStatus(punter: PunterProfile): AccountStatus =
    punter.status match {
      case PunterStatus.Active       => AccountStatus.Open
      case PunterStatus.Unverified   => AccountStatus.Pending
      case PunterStatus.InCoolOff    => AccountStatus.Suspended
      case PunterStatus.SelfExcluded => AccountStatus.Suspended
      case PunterStatus.Suspended(suspensionEntity) =>
        suspensionEntity match {
          case SuspensionEntity.Deceased(_, _, _) => AccountStatus.Closed
          case SuspensionEntity.NegativeBalance(_) | SuspensionEntity.OperatorSuspend(_) |
              SuspensionEntity.RegistrationIssue(_) =>
            AccountStatus.Suspended
        }
      case PunterStatus.Deleted => AccountStatus.Closed
    }
  private def punterExclusionReason(punter: PunterProfile): Option[ExclusionReason] =
    punter.status match {
      case PunterStatus.Active       => None
      case PunterStatus.Deleted      => None
      case PunterStatus.InCoolOff    => Some(ExclusionReason.Cooldown)
      case PunterStatus.SelfExcluded => Some(ExclusionReason.SelfExcluded)
      case PunterStatus.Unverified   => Some(ExclusionReason.KYCFailure)
      case PunterStatus.Suspended(suspensionEntity) =>
        suspensionEntity match {
          case SuspensionEntity.Deceased(_, _, _)                                        => None
          case SuspensionEntity.NegativeBalance(_) | SuspensionEntity.OperatorSuspend(_) => Some(ExclusionReason.Locked)
          case SuspensionEntity.RegistrationIssue(_)                                     => Some(ExclusionReason.KYCFailure)
        }
    }
}
