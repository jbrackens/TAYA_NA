package phoenix.core.websocket

import scala.concurrent.duration._
import scala.reflect.ClassTag
import scala.util.Failure
import scala.util.Success

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.persistence.jdbc.query.scaladsl.JdbcReadJournal
import akka.persistence.query.EventEnvelope
import akka.persistence.query.Offset
import akka.persistence.query.PersistenceQuery
import akka.persistence.query.Sequence
import akka.stream.SourceRef
import akka.stream.scaladsl.BroadcastHub
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.FlowWithContext
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.SourceWithContext
import akka.stream.scaladsl.StreamRefs
import org.slf4j.LoggerFactory

import phoenix.core.websocket.Broadcaster._
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.websockets.domain.WebsocketMessageOffsetRepository

final case class Broadcaster[I, M](
    broadcastingHub: BroadcastingHub[M],
    messageFilterFlowFactory: MessageFilterFlowFactory[I, M]) {
  private val log = LoggerFactory.getLogger(getClass)

  def createSourceRefForId(id: I)(implicit system: ActorSystem[_]): SourceRef[M] = {
    implicit val ec = system.executionContext
    broadcastingHub
      .map {
        case (message, _) =>
          message
      }
      .via(messageFilterFlowFactory(id))
      .watchTermination() { (_, f) =>
        f.andThen {
          case Success(_) => log.info(s"Successful termination for broadcastingHub $id")
          case Failure(e) => log.info(s"Failure when terminating broadcastingHub $id", e)
        }
        NotUsed
      }
      .log("wsFilteredSourceRef")
      .runWith(StreamRefs.sourceRef())
  }
}

object Broadcaster {

  type BroadcastingHub[MessageType] = Source[(MessageType, Offset), NotUsed]
  type MessageCollectorFlow[EventType, MessageType] =
    FlowWithContext[EventType, Offset, MessageType, Offset, NotUsed]
  type MessageFilterFlow[MessageType] = Flow[MessageType, MessageType, NotUsed]
  type MessageFilterFlowFactory[IdType, MessageType] =
    IdType => MessageFilterFlow[MessageType]

  def apply[ID, EVENT, MESSAGE](
      tag: ProjectionTag,
      offsetRepository: WebsocketMessageOffsetRepository,
      messageCollectorFlow: MessageCollectorFlow[EVENT, MESSAGE],
      messageFilterFlowFactory: MessageFilterFlowFactory[ID, MESSAGE])(implicit
      system: ActorSystem[_],
      classTag: ClassTag[EVENT]): Broadcaster[ID, MESSAGE] = {
    val broadcaster: BroadcastingHub[MESSAGE] = {
      val broadcaster = SourceWithContext
        .fromTuples(
          Source
            .future(offsetRepository.readOffset(tag))
            .map(_.getOrElse(0L))
            .flatMapConcat { currentOffset =>
              PersistenceQuery(system)
                .readJournalFor[JdbcReadJournal](JdbcReadJournal.Identifier)
                .eventsByTag(tag.value, currentOffset)
            }
            .collect {
              case EventEnvelope(offset, _, _, event) if classTag.runtimeClass.isInstance(event) =>
                (event.asInstanceOf[EVENT], offset)
            })
        .via(messageCollectorFlow)
        .asSource
        .toMat(BroadcastHub.sink(bufferSize = 256))(Keep.right)
        .run()

      val persistingSequenceNumber = Flow[(MESSAGE, Offset)]
        .collect {
          case (_, Sequence(offset)) => offset
        }
        .groupedWithin(10, 10.seconds)
        .map(_.toList)
        .collect {
          case list @ _ :: _ => list.max
        }
        .mapAsync(parallelism = 1) { currentOffset =>
          offsetRepository.upsertOffset(tag, currentOffset)
        }
        .to(Sink.ignore)

      broadcaster.runWith(persistingSequenceNumber)

      broadcaster
    }

    new Broadcaster(broadcaster, messageFilterFlowFactory)
  }
}
