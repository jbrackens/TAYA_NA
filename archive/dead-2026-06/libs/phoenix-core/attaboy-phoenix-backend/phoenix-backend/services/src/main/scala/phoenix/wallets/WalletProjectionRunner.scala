package phoenix.wallets

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.projections.ProjectionRunner
import phoenix.wallets.WalletActorProtocol.events.WalletEvent

object WalletProjectionRunner {
  val build: (ActorSystem[Nothing], DatabaseConfig[JdbcProfile]) => ProjectionRunner[WalletEvent] =
    ProjectionRunner.projectionRunnerFor[WalletEvent](WalletTags.walletTags)(_, _)
}
