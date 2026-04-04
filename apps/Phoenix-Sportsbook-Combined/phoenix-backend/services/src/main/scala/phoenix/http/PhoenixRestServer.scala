package phoenix.http
import akka.actor.typed.ActorSystem
import akka.http.scaladsl.server.Route
import org.slf4j.LoggerFactory

import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsDomainConfig
import phoenix.bets.GeolocationValidator
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStakeRepository
import phoenix.core.Clock
import phoenix.core.emailing.Mailer
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.http.core.HttpServer
import phoenix.http.core.SwaggerDefinition
import phoenix.http.routes.PhoenixRestRoutes
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext
import phoenix.migrations.MarketsMigrator
import phoenix.notes.NoteModule
import phoenix.payments.infrastructure.http.PaymentsRoutes
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.AccountVerificationCodeRepository
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.domain.PunterDeviceFingerprintsRepository
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.prediction.infrastructure.PredictionHistoryLookup
import phoenix.prediction.infrastructure.PredictionProjectionService
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.reports.ReportsModule
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext

final class PhoenixRestServer(val swagger: SwaggerDefinition, routes: Route, port: Int, system: ActorSystem[_]) {
  def start(): Unit = HttpServer.start(classOf[PhoenixRestServer].getSimpleName, routes, port, system)
}

object PhoenixRestServer {
  private val log = LoggerFactory.getLogger(getClass)

  def create(
      port: Int,
      bets: BetsBoundedContext,
      markets: MarketsBoundedContext,
      wallets: WalletsBoundedContext,
      punters: PuntersBoundedContext,
      geoComplyRoutes: GeoComplyRoutes,
      paymentsRoutes: PaymentsRoutes,
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      puntersViewRepository: View01PatronDetailsRepository,
      termsAndConditionsRepository: TermsAndConditionsRepository,
      verificationRepository: MultiFactorAuthenticationService,
      accountVerificationCodeRepository: AccountVerificationCodeRepository,
      registrationEventRepository: RegistrationEventRepository,
      limitsHistoryRepository: PunterLimitsHistoryRepository,
      deviceFingerprintsRepository: PunterDeviceFingerprintsRepository,
      coolOffsHistoryRepository: PunterCoolOffsHistoryRepository,
      idComplyService: IdComplyService,
      excludedPlayersRepository: ExcludedPlayersRepository,
      marketBetsRepository: MarketBetsRepository,
      punterStakeRepository: PunterStakeRepository,
      reportsModule: ReportsModule,
      marketsMigrator: MarketsMigrator,
      mailer: Mailer,
      geolocationValidator: GeolocationValidator,
      uuidGenerator: UUIDGenerator,
      auditLogBackofficeRoutes: AuditLogBackofficeRoutes,
      noteModule: NoteModule,
      puntersDomainConfig: PuntersDomainConfig,
      betsDomainConfig: BetsDomainConfig,
      predictionReadModels: PredictionReadModelService = PredictionReadModelService.noop,
      predictionQueryService: PredictionQueryService = PredictionReadModelService.noopQuery,
      predictionProjectionService: Option[PredictionProjectionService] = None,
      predictionHistoryLookup: PredictionHistoryLookup = PredictionReadModelService.noopQuery)(implicit
      system: ActorSystem[_],
      clock: Clock,
      jwtAuthenticator: JwtAuthenticator): PhoenixRestServer = {

    log.info("Phoenix REST routes starting...")

    val routes = PhoenixRestRoutes.create(
      bets,
      markets,
      wallets,
      punters,
      geoComplyRoutes,
      paymentsRoutes,
      authenticationRepository,
      puntersRepository,
      puntersViewRepository,
      termsAndConditionsRepository,
      verificationRepository,
      accountVerificationCodeRepository,
      registrationEventRepository,
      limitsHistoryRepository,
      deviceFingerprintsRepository,
      coolOffsHistoryRepository,
      idComplyService,
      excludedPlayersRepository,
      marketBetsRepository,
      punterStakeRepository,
      reportsModule,
      marketsMigrator,
      mailer,
      geolocationValidator,
      uuidGenerator,
      auditLogBackofficeRoutes,
      noteModule,
      puntersDomainConfig,
      betsDomainConfig,
      predictionReadModels,
      predictionQueryService,
      predictionProjectionService,
      predictionHistoryLookup)

    new PhoenixRestServer(routes.swaggerDefinition, routes.toAkkaHttp, port, system)
  }
}
