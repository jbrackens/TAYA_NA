package phoenix.core.scheduler

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.receptionist.Receptionist
import akka.actor.typed.receptionist.ServiceKey
import akka.actor.typed.scaladsl.ActorContext
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.typed.ClusterSingleton
import akka.cluster.typed.SingletonActor
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.CirceAkkaSerializable
import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils._
import phoenix.core.scheduler.AkkaScheduler.Tick

final class AkkaScheduler(jobRunner: JobRunner, clock: Clock)(implicit system: ActorSystem[_]) {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  def scheduleJob(jobToSchedule: ScheduledJob[_], config: ScheduledJobConfig): Unit = {
    val singletonManager = ClusterSingleton(system)
    log.info(s"Job ${config.name} - scheduling ${jobToSchedule.simpleObjectName} with config $config")
    val actor = SingletonActor(JobRunnerActor(jobToSchedule, config), config.name)
    val actorKey = ServiceKey[Tick.type](config.name)
    val singletonActor = singletonManager.init(actor)
    system.receptionist ! Receptionist.Register(actorKey, singletonActor)
  }

  private object JobRunnerActor {
    def apply(jobToSchedule: ScheduledJob[_], config: ScheduledJobConfig): Behavior[Tick.type] =
      Behaviors.setup { context =>
        log.info(s"Job ${config.name} - starting JobRunnerActor singleton")

        val execution = JobExecutionCalculator.calculateExecution(asOf = clock.currentOffsetDateTime(), config.schedule)
        scheduleJob(context, config, execution)

        Behaviors.receive { (_, _) =>
          attemptJobExecution(jobToSchedule, config, execution)
          Behaviors.same
        }
      }

    private def scheduleJob(
        context: ActorContext[Tick.type],
        config: ScheduledJobConfig,
        execution: JobExecution): Unit = {
      implicit val ec: ExecutionContext = context.executionContext
      val scheduler = context.system.scheduler

      log.info(
        s"Job ${config.name} - delayed by ${execution.initialDelay}, with next execution planned at ${execution.firstExecution}")
      val _ = scheduler.scheduleAtFixedRate(execution.initialDelay, execution.subsequentExecutionsInterval)(() =>
        context.self ! Tick)
    }

    private def attemptJobExecution(
        jobToSchedule: ScheduledJob[_],
        config: ScheduledJobConfig,
        execution: JobExecution): Unit = {
      val now = clock.currentOffsetDateTime()
      if (execution.shouldExecuteAt(now))
        jobRunner.runJob(jobToSchedule, config)
      else
        log.debug(s"Job ${config.name} - skipping execution at $now")
    }
  }
}

object AkkaScheduler {
  final case object Tick extends CirceAkkaSerializable
}
