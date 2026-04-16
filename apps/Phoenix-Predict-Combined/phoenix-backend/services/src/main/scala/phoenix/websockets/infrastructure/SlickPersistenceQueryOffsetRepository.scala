package phoenix.websockets.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.websockets.domain.WebsocketMessageOffsetRepository
import phoenix.websockets.domain.WebsocketMessageOffsetRepository.WebsocketOffset
import phoenix.websockets.infrastructure.WebsocketDomainMappers.offsetKeyMapper

final class SlickPersistenceQueryOffsetRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends WebsocketMessageOffsetRepository {
  import dbConfig.db

  private val query: TableQuery[WebsocketStreamOffsetTable] = TableQuery[WebsocketStreamOffsetTable]

  override def upsertOffset(tag: ProjectionTag, offset: Long): Future[Unit] =
    db.run(query.insertOrUpdate(WebsocketOffset(tag, offset))).map(_ => ())

  override def readOffset(tag: ProjectionTag): Future[Option[Long]] =
    db.run(query.filter(_.key === tag).result.headOption).map(_.map(_.offset))
}

private class WebsocketStreamOffsetTable(tag: Tag) extends Table[WebsocketOffset](tag, "persistence_query_offsets") {
  def key: Rep[ProjectionTag] = column[ProjectionTag]("key", O.PrimaryKey)
  def offset: Rep[Long] = column[Long]("current_offset")

  override def * : ProvenShape[WebsocketOffset] = (key, offset).mapTo[WebsocketOffset]
}
