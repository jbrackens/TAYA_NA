package phoenix.http.routes.backoffice
import akka.actor.typed.ActorSystem
import sttp.tapir.EndpointInput
import sttp.tapir.stringToPath

import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.bets.BetsBoundedContext
import phoenix.bets.infrastructure.http.BetBackofficeRoutes
import phoenix.config.infrastructure.http.ConfigBackOfficeRoutes
import phoenix.core.Clock
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.http.core.Routes
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext
import phoenix.migrations.MarketsMigrator
import phoenix.notes.infrastructure.http.NoteBackofficeRoutes
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.infrastructure.http.PunterBackofficeRoutes
import phoenix.prediction.infrastructure.PredictionHistoryLookup
import phoenix.prediction.infrastructure.PredictionProjectionService
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.prediction.infrastructure.http.PredictionBackofficeRoutes
import phoenix.reports.ReportsModule
import phoenix.wallets.WalletsBoundedContext

final class BackofficeRoutes(
    mountPoint: MountPoint,
    bets: BetsBoundedContext,
    markets: MarketsBoundedContext,
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    puntersViewRepository: View01PatronDetailsRepository,
    limitsHistoryRepository: PunterLimitsHistoryRepository,
    coolOffsHistoryRepository: PunterCoolOffsHistoryRepository,
    auditLogBackoffice: AuditLogBackofficeRoutes,
    noteBackofficeRoutes: NoteBackofficeRoutes,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    marketsMigrator: MarketsMigrator,
    excludedPlayersRepository: ExcludedPlayersRepository,
    registrationEventRepository: RegistrationEventRepository,
    reportsModule: ReportsModule,
    predictionReadModels: PredictionReadModelService = PredictionReadModelService.noop,
    predictionQueryService: PredictionQueryService = PredictionReadModelService.noopQuery,
    predictionProjectionService: Option[PredictionProjectionService] = None,
    predictionHistoryLookup: PredictionHistoryLookup = PredictionReadModelService.noopQuery)(implicit
    auth: JwtAuthenticator,
    system: ActorSystem[_],
    clock: Clock)
    extends Routes {

  implicit val ec = system.executionContext
  val tradingMountPoint = mountPoint / stringToPath("trading")

  private val marketsBackoffice = new MarketBackofficeRoutes(tradingMountPoint, markets, marketsMigrator)
  private val fixturesBackoffice = new FixtureBackofficeRoutes(tradingMountPoint, markets)
  private val tournamentsBackoffice = new TournamentBackofficeRoutes(tradingMountPoint, markets)
  private val puntersBackoffice =
    new PunterBackofficeRoutes(
      mountPoint,
      bets,
      punters,
      wallets,
      authenticationRepository,
      puntersRepository,
      puntersViewRepository,
      limitsHistoryRepository,
      coolOffsHistoryRepository,
      termsAndConditionsRepository,
      excludedPlayersRepository,
      registrationEventRepository,
      reportsModule,
      clock,
      if (predictionHistoryLookup == PredictionReadModelService.noopQuery) predictionReadModels else predictionHistoryLookup)
  private val betBackofficeRoutes = new BetBackofficeRoutes(mountPoint, bets, clock)

  private val configBackoffice = new ConfigBackOfficeRoutes(mountPoint, termsAndConditionsRepository)
  private val predictionBackoffice =
    new PredictionBackofficeRoutes(
      basePath = mountPoint,
      predictionReadModels =
        if (predictionQueryService == PredictionReadModelService.noopQuery) predictionReadModels else predictionQueryService,
      predictionProjectionService = predictionProjectionService,
      wallets = Some(wallets),
      auditLogger = Some(auditLogBackoffice.auditLogger))

  override val endpoints: Routes.Endpoints =
    auditLogBackoffice.endpoints ++
    noteBackofficeRoutes.endpoints ++
    marketsBackoffice.endpoints ++
    fixturesBackoffice.endpoints ++
    tournamentsBackoffice.endpoints ++
    puntersBackoffice.endpoints ++
    betBackofficeRoutes.endpoints ++
    configBackoffice.endpoints ++
    predictionBackoffice.endpoints

}

object BackofficeRoutes {
  type MountPoint = EndpointInput[Unit]

  val adminMountPoint = stringToPath("admin")
}
