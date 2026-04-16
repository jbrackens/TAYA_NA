package phoenix.core.websocket

import scala.concurrent.Future

import akka.stream.SourceRef

trait EventStream[ID, MESSAGE] {

  def streamStateUpdates(id: ID): Future[SourceRef[MESSAGE]]
}
