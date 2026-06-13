package phoenix.oddin

import java.util.UUID

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.http.caching.scaladsl.Cache
import org.slf4j.{ Logger, LoggerFactory }
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import scala.concurrent.{ ExecutionContext, Future }
import scala.util.Failure

class CachingMarketIdMapper(cache: Cache[String, UUID], marketIdRepository: MarketIdRepository)(implicit
    executionContext: ExecutionContext)
    extends MarketIdMapper {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def retrievePhoenixId(oddinMarketId: String): Future[UUID] =
    cache
      .getOrLoad(
        oddinMarketId,
        oddinMarketId => marketIdRepository.saveAndReturnMapping(oddinMarketId).map(_.phoenixMarketId))
      .andThen {
        case Failure(exception) =>
          log.error(
            s"Failed to retrieve Phoenix Market ID for Oddin Market ID $oddinMarketId. Removing key from cache.",
            exception)
          cache.remove(oddinMarketId)
      }
}

object CachingMarketIdMapper extends CacheSupport {

  def apply(system: ActorSystem[_], dbConfig: DatabaseConfig[JdbcProfile], cacheConfig: CacheConfig): MarketIdMapper = {
    val marketIdRepository = new SlickMarketIdRepository(dbConfig)
    apply(system, marketIdRepository, cacheConfig)
  }

  def apply(
      system: ActorSystem[_],
      marketIdRepository: MarketIdRepository,
      cacheConfig: CacheConfig): MarketIdMapper = {
    implicit val ec: ExecutionContext = system.executionContext

    val cache = createCache[UUID](system.toClassic, cacheConfig)
    new CachingMarketIdMapper(cache, marketIdRepository)
  }
}
