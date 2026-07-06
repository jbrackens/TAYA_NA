package phoenix.dbviews

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.CirceAkkaSerializable
import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.bets.BetTags
import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.core.deployment.DeploymentConfig
import phoenix.dbviews.infrastructure.SlickView01PatronDetailsRepository
import phoenix.dbviews.infrastructure.SlickView02PatronSessionsRepository
import phoenix.dbviews.infrastructure.SlickView03WalletTransfersRepository
import phoenix.dbviews.infrastructure.SlickView06SportsWagersRepository
import phoenix.dbviews.infrastructure.SlickView07CashTransactionsRepository
import phoenix.dbviews.infrastructure.SlickView08PatronsGameLimsRepository
import phoenix.dbviews.infrastructure.SlickView09PatronStatusRepository
import phoenix.dbviews.infrastructure.View01PatronDetailsProjectionHandler
import phoenix.dbviews.infrastructure.View02PatronSessionsProjectionHandler
import phoenix.dbviews.infrastructure.View03WalletTransfersProjectionHandler
import phoenix.dbviews.infrastructure.View06SportsWagersProjectionHandler
import phoenix.dbviews.infrastructure.View07CashTransactionsProjectionHandler
import phoenix.dbviews.infrastructure.View08PatronGameLimsProjectionHandler
import phoenix.dbviews.infrastructure.View09PatronStatusProjectionHandler
import phoenix.markets.MarketsBoundedContext
import phoenix.projections.ProjectionRunner
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterTags
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletTags

object DGEViewsModule {
  private val log = LoggerFactory.getLogger(getClass)
  def init(
      applicationPuntersRepository: ApplicationPuntersRepository,
      punters: PuntersBoundedContext,
      marketsBoundedContext: MarketsBoundedContext,
      betsBoundedContext: BetsBoundedContext,
      clock: Clock,
      dbConfig: DatabaseConfig[JdbcProfile],
      system: ActorSystem[_])(implicit ec: ExecutionContext): Unit = {
    log.info("DGEViews module starting")
    val easternClock = DeploymentClock.fromConfig(DeploymentConfig.of(system))
    val dgeViewsConfig = DGEViewsConfig.of(system)

    val view01PatronDetailsRepository = new SlickView01PatronDetailsRepository(dbConfig, clock)
    val view01PatronDetailsProjectionHandler =
      new View01PatronDetailsProjectionHandler(view01PatronDetailsRepository, applicationPuntersRepository, clock)
    ProjectionRunner
      .projectionRunnerFor[PunterEvent](PunterTags.punterTags)(system, dbConfig)
      .runProjection(dgeViewsConfig.projections.view01PatronDetails, view01PatronDetailsProjectionHandler)

    val view02PatronSessionsRepository = new SlickView02PatronSessionsRepository(dbConfig, clock)
    val view02PatronSessionsProjectionHandler =
      new View02PatronSessionsProjectionHandler(view02PatronSessionsRepository)
    ProjectionRunner
      .projectionRunnerFor[PunterEvent](PunterTags.punterTags)(system, dbConfig)
      .runProjection(dgeViewsConfig.projections.view02PatronSessions, view02PatronSessionsProjectionHandler)

    val view03WalletTransfersRepository = new SlickView03WalletTransfersRepository(dbConfig, clock)
    val view03WalletTransfersProjectionHandler = new View03WalletTransfersProjectionHandler(
      view03WalletTransfersRepository,
      punters,
      marketsBoundedContext,
      betsBoundedContext,
      clock)
    ProjectionRunner
      .projectionRunnerFor[WalletEvent](WalletTags.walletTags)(system, dbConfig)
      .runProjection(dgeViewsConfig.projections.view03WalletTransfers, view03WalletTransfersProjectionHandler)

    val view06SportsWagersRepository = new SlickView06SportsWagersRepository(dbConfig, clock)
    val view06SportsWagersProjectionHandler =
      new View06SportsWagersProjectionHandler(view06SportsWagersRepository, marketsBoundedContext, clock)
    ProjectionRunner
      .projectionRunnerFor[BetEvent](BetTags.betTags)(system, dbConfig)
      .runProjection(dgeViewsConfig.projections.view06SportsWagers, view06SportsWagersProjectionHandler)

    val view07CashTransactionsRepository = new SlickView07CashTransactionsRepository(dbConfig, easternClock)
    val view07CashTransactionsProjectionHandler =
      new View07CashTransactionsProjectionHandler(view07CashTransactionsRepository, log)
    ProjectionRunner
      .projectionRunnerFor[WalletEvent](WalletTags.walletTags)(system, dbConfig)
      .runProjection(dgeViewsConfig.projections.view07CashTransactions, view07CashTransactionsProjectionHandler)

    val view08PatronGameLimsRepository = new SlickView08PatronsGameLimsRepository(dbConfig, easternClock)
    val view08PatronGameLimsProjectionHandler =
      new View08PatronGameLimsProjectionHandler(view08PatronGameLimsRepository, clock, log)
    ProjectionRunner
      .projectionRunnerFor[PunterEvent](PunterTags.punterTags)(system, dbConfig)
      .runProjection(dgeViewsConfig.projections.view08PatronsGameLims, view08PatronGameLimsProjectionHandler)

    val view09PatronStatusRepository = new SlickView09PatronStatusRepository(dbConfig)
    val view09PatronStatusProjectionHandler =
      new View09PatronStatusProjectionHandler(punters, view09PatronStatusRepository, clock, log)
    ProjectionRunner
      .projectionRunnerFor[CirceAkkaSerializable](PunterTags.punterTags ++ WalletTags.walletTags)(system, dbConfig)
      .runProjection(dgeViewsConfig.projections.view09PatronStatus, view09PatronStatusProjectionHandler)
  }
}
