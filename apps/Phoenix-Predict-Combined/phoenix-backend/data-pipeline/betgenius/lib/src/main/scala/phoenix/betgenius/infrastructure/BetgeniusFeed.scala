package phoenix.betgenius.infrastructure
import scala.concurrent.ExecutionContext
import scala.util.Failure
import scala.util.Success

import akka.stream.QueueOfferResult
import akka.stream.scaladsl._
import org.slf4j.LoggerFactory

import phoenix.betgenius.domain.Ingest

class BetgeniusFeed(queue: SourceQueue[Ingest])(implicit ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)

  def publish(ingest: Ingest) = {
    queue.offer(ingest).andThen {
      case Success(QueueOfferResult.Enqueued)    => log.debug(s"ENQUEUED $ingest")
      case Success(QueueOfferResult.Dropped)     => log.warn(s"DROPPED $ingest")
      case Success(QueueOfferResult.Failure(ex)) => log.error(s"FAILURE $ingest", ex)
      case Success(QueueOfferResult.QueueClosed) => log.error(s"QUEUE CLOSED $ingest")
      case Failure(ex)                           => log.error(s"QUEUE OFFER FAILED (message=$ingest)", ex)
    }
  }
}
