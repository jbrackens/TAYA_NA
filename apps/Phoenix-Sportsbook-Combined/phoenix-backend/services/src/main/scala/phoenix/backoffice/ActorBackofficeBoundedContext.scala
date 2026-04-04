package phoenix.backoffice

import scala.concurrent.ExecutionContextExecutor

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.core.Clock
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.NoteRepository
import phoenix.projections.ProjectionRunner
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.application.es.WalletPunterStatusEventHandler
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsConfig

object ActorBackofficeBoundedContext {
  def apply(
      system: ActorSystem[Nothing],
      dbConfig: DatabaseConfig[JdbcProfile],
      betProjectionRunner: ProjectionRunner[BetEvent],
      walletProjectionRunner: ProjectionRunner[WalletEvent],
      puntersBoundedContext: PuntersBoundedContext,
      walletsBoundedContext: WalletsBoundedContext,
      noteRepository: NoteRepository,
      uuidGenerator: UUIDGenerator,
      clock: Clock): MarketExposureReadRepository = {
    implicit val ec: ExecutionContextExecutor = system.executionContext

    val config = BackofficeConfig.of(system)
    val walletsConfig = WalletsConfig.of(system)

    val repository = new SlickMarketExposureRepository(dbConfig)
    val insertNotes = new InsertNotes(noteRepository, clock, uuidGenerator)

    betProjectionRunner.runProjection(
      config.projections.betsForMarketExposure,
      new MarketExposureProjectionHandler(repository))

    walletProjectionRunner.runProjection(
      walletsConfig.projections.walletPunterStatus,
      new WalletPunterStatusEventHandler(puntersBoundedContext, walletsBoundedContext, insertNotes, clock))

    repository
  }
}
