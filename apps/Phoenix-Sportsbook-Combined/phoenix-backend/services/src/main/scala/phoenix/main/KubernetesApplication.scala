package phoenix.main

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.ActorContext
import akka.management.cluster.bootstrap.ClusterBootstrap
import akka.management.scaladsl.AkkaManagement

import phoenix.core.UnitUtils.UnitCastOps
import phoenix.main.Application._

object KubernetesApplication extends Application with Main {

  override def beforeApplicationStart(context: ActorContext[_]): Unit = {
    AkkaManagement(context.system).start()
    ClusterBootstrap(context.system).start()
  }

  override def afterApplicationStart(context: ActorContext[_]): Unit = {}

  def runApplication(args: Array[String]): Unit = {
    require(args.length == 0, "Usage: empty argument list")
    ActorSystem[RootCommand](
      RootBehavior(
        HttpPorts(
          forRestServer = 9000,
          forDevServer = 9001,
          forWebSockets = 9002,
          forBetgeniusServer = 9003,
          forPxpServer = 9004)),
      "Phoenix").toUnit()
  }
}
