package phoenix.dbviews.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.scalatest.Assertion
import org.scalatest.matchers.should.Matchers._

import phoenix.core.Clock
import phoenix.dbviews.domain.model._
import phoenix.dbviews.infrastructure.SlickView01PatronDetailsRepository.PatronDetailsWithEasternTime
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.PunterPersonalDetails

final class InMemoryView01PatronDetailsRepository(easternClock: Clock)(implicit ec: ExecutionContext)
    extends View01PatronDetailsRepository {
  import phoenix.dbviews.infrastructure.SlickView01PatronDetailsRepository.PatronDetailsWithEasternTime.withEasternTime
  var patronDetails: List[PatronDetailsWithEasternTime] = List.empty

  override def upsert(detail: PatronDetails): Future[Unit] =
    Future.successful {
      patronDetails =
        patronDetails.filter(_.patronDetails.punterId != detail.punterId) :+ withEasternTime(detail, easternClock)
    }

  override def updateDetails(punterId: PunterId, update: PunterPersonalDetails => PunterPersonalDetails): Future[Unit] =
    get(punterId).flatMap {
      case Some(punterDetails) =>
        upsert(punterDetails.copy(personal = update(punterDetails.personal)))
      case None => Future(())
    }

  override def get(punterId: PunterId): Future[Option[PatronDetails]] =
    Future.successful {
      patronDetails.find(_.patronDetails.punterId == punterId).map(_.patronDetails)
    }

  def shouldContainDetails(predicate: PatronDetails => Boolean): Assertion =
    patronDetails.map(_.patronDetails).exists(predicate) shouldBe true
}
