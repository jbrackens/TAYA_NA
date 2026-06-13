package phoenix.oddin.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.ActorSystem
import akka.http.caching.scaladsl.Cache
import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.core.CacheConfig
import phoenix.core.CacheSupport
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketDescriptionsRepository
import phoenix.oddin.domain.MarketDescriptionsRepository.UnableToFindMarketDescription
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.infrastructure.OddinRestApiCachedMarketDescriptionsRepository.MarketDescriptionsCacheKey

final class OddinRestApiCachedMarketDescriptionsRepository(
    cache: Cache[MarketDescriptionsCacheKey.type, List[MarketDescription]],
    oddinRestApi: OddinRestApi)(implicit ec: ExecutionContext)
    extends MarketDescriptionsRepository {

  private val log = LoggerFactory.getLogger(getClass)

  override def find(
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers): EitherT[Future, UnableToFindMarketDescription, MarketDescription] =
    EitherT.fromOptionF(
      allDescriptions().map(_.find(doesMarketDescriptionMatch(_, marketDescriptionId, marketSpecifiers))),
      UnableToFindMarketDescription(marketDescriptionId, marketSpecifiers))

  private def allDescriptions(): Future[List[MarketDescription]] =
    cache.getOrLoad(
      MarketDescriptionsCacheKey,
      _ =>
        oddinRestApi.listAllMarketDescriptions().value.map {
          case Right(result) => result
          case Left(error) =>
            log.error(s"failed to retrieve list of market descriptions '$error'")
            List.empty
        })

  private def doesMarketDescriptionMatch(
      marketDescription: MarketDescription,
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers): Boolean =
    marketDescription.marketDescriptionId == marketDescriptionId &&
    marketSpecifiers.hasVariantEqualTo(marketDescription.marketDescriptionVariant)
}

object OddinRestApiCachedMarketDescriptionsRepository extends CacheSupport {

  final case object MarketDescriptionsCacheKey

  def apply(oddinRestApi: OddinRestApi, cacheConfig: CacheConfig)(implicit
      system: ActorSystem,
      ec: ExecutionContext): MarketDescriptionsRepository = {
    val cache = createCache[MarketDescriptionsCacheKey.type, List[MarketDescription]](system, cacheConfig)
    new OddinRestApiCachedMarketDescriptionsRepository(cache, oddinRestApi)
  }
}
