package phoenix.reports.domain

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT

import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.wallets.DailyWalletSummary
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction

private[reports] trait WalletSummaryRepository {
  def createWallet(punterId: PunterId, balance: Balance, createdAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, PunterWalletAlreadyExist, Unit]
  def recordWalletTransaction(punterId: PunterId, transaction: Transaction)(implicit
      ec: ExecutionContext): EitherT[Future, PunterWalletNotFound, Unit]
  def getDailyWalletSummary(day: ReportingPeriod.Day): Source[DailyWalletSummary, NotUsed]
  def getDailyWalletSummaryByPeriod(period: ReportingPeriod): Source[DailyWalletSummary, NotUsed]
}

private[reports] final case class PunterWalletAlreadyExist(id: PunterId)
    extends RuntimeException(s"Wallet for punter [punterId = $id] already exist")

private[reports] final case class PunterWalletNotFound(id: PunterId)
    extends RuntimeException(s"Wallet for punter [punterId = $id] not found")
