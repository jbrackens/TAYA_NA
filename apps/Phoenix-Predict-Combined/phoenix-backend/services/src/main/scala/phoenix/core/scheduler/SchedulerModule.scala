package phoenix.core.scheduler

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem

import phoenix.core.Clock

final class SchedulerModule(val akkaJobScheduler: AkkaScheduler)

object SchedulerModule {
  def init(clock: Clock)(implicit system: ActorSystem[_]): SchedulerModule = {

    // yes, could be configured and maybe injected from Main, but it's temporally solution just to not block Akka threads
    val executorService = Executors.newFixedThreadPool(8)
    val schedulerExecutor = ExecutionContext.fromExecutor(executorService)
    val jobRunner = new JobRunnerImpl(system.classicSystem.scheduler)(schedulerExecutor)

    val akkaScheduler = new AkkaScheduler(jobRunner, clock)

    new SchedulerModule(akkaScheduler)
  }
}
