package phoenix.websockets.domain

import scala.concurrent.Future

import phoenix.sharding.ProjectionTags.ProjectionTag

trait WebsocketMessageOffsetRepository {

  def upsertOffset(key: ProjectionTag, offset: Long): Future[Unit]

  def readOffset(key: ProjectionTag): Future[Option[Long]]
}

object WebsocketMessageOffsetRepository {

  final case class WebsocketOffset(tag: ProjectionTag, offset: Long)
}
