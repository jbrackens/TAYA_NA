package phoenix.oddin.domain

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.oddin.domain.MarketDescriptionsRepository.UnableToFindMarketDescription
import phoenix.oddin.domain.marketDescription.MarketDescription

trait MarketDescriptionsRepository {

  def find(
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers): EitherT[Future, UnableToFindMarketDescription, MarketDescription]
}

object MarketDescriptionsRepository {

  final case class UnableToFindMarketDescription(
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers)
}
