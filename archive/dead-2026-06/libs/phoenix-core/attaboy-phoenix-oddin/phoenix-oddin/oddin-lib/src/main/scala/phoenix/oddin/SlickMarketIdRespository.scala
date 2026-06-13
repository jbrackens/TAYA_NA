package phoenix.oddin

import java.time.Instant
import java.util.UUID

import phoenix.oddin.MarketIdRepository.MarketIdMapping
import phoenix.oddin.SlickMarketIdRepository._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.{ ExecutionContext, Future }

class SlickMarketIdRepository(dbConfig: DatabaseConfig[JdbcProfile]) extends MarketIdRepository {
  private val db = dbConfig.db

  private val marketIdMappingsCompiled = Compiled(marketIdMappings)
  private val marketIdMappingsByOddinMarketIdCompiled = Compiled(marketIdMappingsByOddinMarketId _)

  override def findAllMappings()(implicit ec: ExecutionContext): Future[Seq[MarketIdMapping]] =
    db.run(marketIdMappingsCompiled.result)

  override def saveAndReturnMapping(oddinMarketId: String)(implicit ec: ExecutionContext): Future[MarketIdMapping] = {
    val query = for {
      existing <- marketIdMappingsByOddinMarketIdCompiled(oddinMarketId).result.headOption
      mapping <- existing.map(DBIO.successful).getOrElse {
        val newMapping = MarketIdMapping(UUID.randomUUID(), oddinMarketId, Instant.now())
        (marketIdMappingsCompiled += newMapping).map(_ => newMapping)
      }
    } yield mapping
    db.run(query.transactionally)
  }
}

object SlickMarketIdRepository {
  class MarketIdMappingTable(tag: Tag) extends Table[MarketIdMapping](tag, "market_id_mappings") {
    def phoenixMarketId = column[UUID]("phoenix_market_id", O.PrimaryKey)
    def oddinMarketId = column[String]("oddin_market_id")
    def createdAt = column[Instant]("created_at_utc")
    def * = (phoenixMarketId, oddinMarketId, createdAt).mapTo[MarketIdMapping]
    def idx = index("index_oddinMarketId", oddinMarketId, unique = true)
  }

  val marketIdMappings: TableQuery[MarketIdMappingTable] = TableQuery[MarketIdMappingTable]
  def marketIdMappingsByOddinMarketId(oddinMarketId: Rep[String]): Query[MarketIdMappingTable, MarketIdMapping, Seq] =
    marketIdMappings.filter(_.oddinMarketId === oddinMarketId).forUpdate
}
