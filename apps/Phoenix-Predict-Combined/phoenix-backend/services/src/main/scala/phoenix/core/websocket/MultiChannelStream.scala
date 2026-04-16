package phoenix.core.websocket

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.Failure
import scala.util.Success

import akka.Done
import akka.actor.ActorRef
import akka.actor.ActorSystem
import akka.pattern.pipe
import akka.stream.CompletionStrategy
import akka.stream.KillSwitches
import akka.stream.OverflowStrategy
import akka.stream.UniqueKillSwitch
import akka.stream.scaladsl.BroadcastHub
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.MergeHub
import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Source
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.CirceAkkaSerializable

class MultiChannelStream[RESPONSE <: CirceAkkaSerializable](name: String)(implicit
    system: ActorSystem,
    ec: ExecutionContext) {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  private val sharedKillSwitch = KillSwitches.shared(s"killswitch-$name")

  /**
   * Main Flow:
   * manual ->   |       |    |           | -> out (ws)
   * channel1 -> | MERGE | -> | BROADCAST | -> ..
   * channel2 -> |       |    |           |
   * ...
   *
   * - Manual producer allows to insert responses to client requests to stream
   * - ChannelX producer emits stream elements on every received change. It's allowed to subscribe to many channels on same WS connection
   * - Broadcast at the end might be used to potentially split results into multiple Sinks, not sure if it's needed added for flexibility
   */
  private val (responseIn, responseOut) = MergeHub
    .source[RESPONSE]
    .log(name)
    .via(sharedKillSwitch.flow)
    .toMat(BroadcastHub.sink)(Keep.both)
    .named(s"$name-mainHUB") // FIXME (PHXD-486): revisit all flow names
    .run()

  /**
   * All responses to WS requests are emitted to this Source
   */
  private[this] val completionMatcher: PartialFunction[Any, CompletionStrategy] = {
    case Done => CompletionStrategy.immediately
  }
  private[this] val failureMatcher: PartialFunction[Any, Throwable] = {
    case t: Throwable =>
      log.error(s"Unexpected error while handling incoming message from backend to socket: ${t.getMessage}")
      t
  }

  private val wsResponsesPublisher: ActorRef =
    Source
      .actorRef(completionMatcher, failureMatcher, Int.MaxValue, OverflowStrategy.dropHead)
      .to(responseIn)
      .named(s"$name-responses")
      .run()

  /**
   * Contains all killSwitches for all connected channelX streams. Used to unsubscribe from specific updates.
   *
   * No thread-safety here, need to be guaranteed externally, eg all operations to be executed via Actor or as stream step.
   */
  private var subscribedChannels: Map[String, UniqueKillSwitch] = Map.empty

  def broadcastOutput: Source[RESPONSE, Any] = {
    responseOut
  }

  /**
   * Adds Channel stream to WSFlow. If the channel was already added remove previous source.
   */
  def subscribe[T](channelId: String, channelUpdates: Source[RESPONSE, T]): T = {
    unsubscribe(channelId)

    log.info(s"Subscribing to $channelId")
    val killswitchFlow = buildKillSwitch()

    val graph: RunnableGraph[(T, UniqueKillSwitch)] =
      channelUpdates
        .viaMat(killswitchFlow)(Keep.both)
        .watchTermination() { (mat, f) =>
          f.andThen {
            case Success(_) => log.info(s"Successful termination for channel $channelId")
            case Failure(e) => log.info(s"Failure when terminating channel $channelId", e)
          }
          mat
        }
        .to(responseIn)
        .named(s"flow-$name-channel-$channelId")

    val (matSource, killSwitch) = graph.run()

    subscribedChannels += (channelId -> killSwitch)

    log.info(s"All subscribed channels: ${subscribedChannels.keySet.mkString("\n")}")

    matSource
  }

  private def buildKillSwitch() =
    Flow.apply[RESPONSE].joinMat(KillSwitches.singleBidi[RESPONSE, RESPONSE])(Keep.right).backpressureTimeout(1.seconds)

  def unsubscribe(channelId: String): Unit = {
    log.info(s"Unsubscribing from $channelId")

    subscribedChannels.get(channelId).foreach { killSwitch =>
      killSwitch.shutdown()
    }
    subscribedChannels -= channelId

    log.info(s"All subscribed channels: ${subscribedChannels.keySet.mkString("\n")}")
  }

  def terminate(): Unit = {
    log.info(s"Terminating and unsubscribing from all channels")

    subscribedChannels.values.foreach { killSwitch =>
      killSwitch.shutdown()
    }

    sharedKillSwitch.shutdown()
  }

  def publishResponse(result: Future[RESPONSE]): Future[RESPONSE] = {
    pipe(result).to(wsResponsesPublisher).future
  }
}
