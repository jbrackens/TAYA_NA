package phoenix.oddin.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.Assertions.fail

import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketDescriptionsRepository
import phoenix.oddin.domain.MarketDescriptionsRepository.UnableToFindMarketDescription
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.marketDescription.MarketDescription

object MarketDescriptionsRepositoryMock {

  def apply(
      findDescriptionFn: (
          MarketDescriptionId,
          MarketSpecifiers) => EitherT[Future, UnableToFindMarketDescription, MarketDescription])
      : MarketDescriptionsRepository =
    (marketDescriptionId: MarketDescriptionId, marketSpecifiers: MarketSpecifiers) =>
      findDescriptionFn(marketDescriptionId, marketSpecifiers)

  def withDescriptions(descriptions: List[MarketDescription])(implicit ec: ExecutionContext) =
    MarketDescriptionsRepositoryMock(findDescriptionFn = (marketDescriptionId, marketSpecifiers) => {
      EitherT.fromOption[Future](
        descriptions.find(
          description =>
            description.marketDescriptionId == marketDescriptionId && marketSpecifiers.hasVariantEqualTo(
              description.marketDescriptionVariant)),
        UnableToFindMarketDescription(marketDescriptionId, marketSpecifiers))
    })

  val failing = MarketDescriptionsRepositoryMock(findDescriptionFn = (_, _) => fail())

  def notFound(implicit ec: ExecutionContext) =
    MarketDescriptionsRepositoryMock(findDescriptionFn = (marketDescriptionId, marketSpecifiers) =>
      EitherT.leftT(UnableToFindMarketDescription(marketDescriptionId, marketSpecifiers)))
}
