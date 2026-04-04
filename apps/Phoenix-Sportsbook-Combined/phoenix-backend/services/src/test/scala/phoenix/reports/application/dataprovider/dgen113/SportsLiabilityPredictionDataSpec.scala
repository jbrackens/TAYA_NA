package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import cats.data.OptionT
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.prediction.infrastructure.http.PredictionPlaceOrderRequest
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.template.dgen113.SportsLiability.PredictionLiabilityRow
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

final class SportsLiabilityPredictionDataSpec extends AnyWordSpecLike with Matchers with FutureSupport {

  "A SportsLiabilityPredictionData" should {
    "produce liability rows for open prediction orders" in {
      val reportingClock = new FakeHardcodedClock(OffsetDateTime.now(ZoneOffset.UTC))
      val reportingPeriod = ReportingPeriod.enclosingDay(reportingClock.currentOffsetDateTime(), reportingClock)
      val punterId = PunterId(s"prediction-liability-${System.nanoTime()}")

      val puntersRepository = new PuntersRepository {
        override def upsert(event: PunterProfile): Future[Unit] = Future.unit
        override def setSuspensionReason(punterId: PunterId, reason: String): Future[Unit] = Future.unit
        override def setActivationPath(
            punterId: PunterId,
            activationPath: ActivationPath,
            verifiedAt: OffsetDateTime,
            verifiedBy: Option[AdminId]): Future[Unit] = Future.unit
        override def find(punterId: PunterId): OptionT[Future, PunterProfile] =
          OptionT.pure(
            PunterProfile(
              punterId,
              generatePunterName(),
              isTestAccount = false,
              ActivationPath.Manual,
              suspensionReason = None,
              verifiedAt = None,
              verifiedBy = None))
        override def getManuallyVerifiedPunters(
            verifiedAfter: OffsetDateTime,
            verifiedBefore: OffsetDateTime): Future[Seq[PunterProfile]] = Future.successful(Seq.empty)
      }

      val readModels = PredictionReadModelService.noop
      val preparedOrder = await(
        readModels.prepareOrder(
          punterId.value,
          PredictionPlaceOrderRequest(
            marketId = "pm-btc-120k-2026",
            outcomeId = "yes",
            stakeUsd = BigDecimal(25))))
        .toOption
        .get
      val storedOrder = await(readModels.placePreparedOrder(preparedOrder, ReservationId(s"prediction-liability-${System.nanoTime()}")))

      val result = await(
        new SportsLiabilityPredictionData(readModels, new PuntersFinder(puntersRepository)).getData(reportingPeriod))
        .filter(_.patronId == PatronIdField(punterId))

      result should contain only
      PredictionLiabilityRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        patronId = PatronIdField(punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        orderId = StringField(storedOrder.orderId),
        marketCategory = StringField("Crypto"),
        marketTitle = StringField("BTC above $120k in 2026"),
        orderDateTime = DateTimeField(OffsetDateTime.parse(storedOrder.createdAt)),
        marketCloseDate = OptionalField.some(DateTimeField(OffsetDateTime.parse("2026-12-31T23:00:00Z"))),
        position = StringField("Yes"),
        stakeAmount = MoneyField(BigDecimal(25)),
        status = StringField("open"))
    }
  }
}
