package gmx.users.internal.source

import akka.Done
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.scaladsl.adapter._
import akka.actor.{ Scheduler, ActorSystem => ClassicActorSystem }
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.kafka.scaladsl.{ Committer, Consumer }
import akka.kafka.{ CommitterSettings, Subscriptions }
import akka.pattern.retry
import gmx.users.internal.source.sbtech.ProcessorSettings
import org.apache.avro.specific.SpecificRecord

import scala.concurrent.duration._
import scala.concurrent.{ ExecutionContext, Future }
import scala.util.Try

object KafkaConsumer {

  def apply[KEY <: SpecificRecord, VALUE <: SpecificRecord](
      clusterSharding: ClusterSharding,
      processorSettings: ProcessorSettings[KEY, VALUE]
    ): Behavior[Command] =
    Behaviors.setup[Command] { ctx =>
      implicit val classic: ClassicActorSystem = ctx.system.toClassic
      implicit val ec: ExecutionContext        = ctx.executionContext
      implicit val scheduler: Scheduler        = classic.scheduler

      //TODO there should be one dispatcher per brand | https://flipsports.atlassian.net/browse/GMV3-349
      val dispatcher = new RecordDispatcher(clusterSharding, processorSettings.brandId, processorSettings.askTimeout)

      val stream: Future[Done] = Consumer
        .sourceWithOffsetContext(
          processorSettings.consumerSettings,
          Subscriptions.topics(processorSettings.topics: _*)
        )
        .log("KafkaConsumer",
             record => s"Customer data ${record.key()} consumed from kafka topic ${record.topic()} on partition ${record.partition()}"
        )
        // MapAsync and Retries can be replaced by reliable delivery
        .mapAsync(20) { record =>
          retry(() => dispatcher.process(record.value()), attempts = 5, delay = 1.second)
        }
        .runWith(Committer.sinkWithOffsetContext(CommitterSettings(classic)))

      stream.onComplete { result =>
        ctx.self ! KafkaConsumerStopped(result)
      }

      Behaviors.receiveMessage[Command] {
        case KafkaConsumerStopped(reason) =>
          ctx.log.info("Consumer stopped {}", reason)
          Behaviors.stopped
      }
    }

  sealed trait Command

  private case class KafkaConsumerStopped(reason: Try[Any]) extends Command
}
