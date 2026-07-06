package phoenix.http.routes

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.server.RejectionHandler
import akka.http.scaladsl.server.Route
import ch.megard.akka.http.cors.scaladsl.CorsDirectives.cors
import ch.megard.akka.http.cors.scaladsl.CorsDirectives.corsRejectionHandler

import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsDomainConfig
import phoenix.bets.GeolocationValidator
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStakeRepository
import phoenix.bets.infrastructure.http.BetRoutes
import phoenix.core.Clock
import phoenix.core.emailing.Mailer
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.http.core.HttpLogging._
import phoenix.http.core.Routes
import phoenix.http.routes.PhoenixRestRoutes.wrapWithCors
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.infrastructure.http.MarketRoutes
import phoenix.migrations.MarketsMigrator
import phoenix.notes.NoteModule
import phoenix.payments.infrastructure.http.PaymentsRoutes
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain._
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.infrastructure.http.PunterRoutes
import phoenix.prediction.botauth.infrastructure.http.PredictionBotRoutes
import phoenix.prediction.infrastructure.PredictionHistoryLookup
import phoenix.prediction.infrastructure.PredictionProjectionService
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.prediction.infrastructure.http.PredictionPlayerRoutes
import phoenix.reports.ReportsModule
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.infrastructure.http.WalletRoutes

final class PhoenixRestRoutes(
    betRoutes: BetRoutes,
    marketRoutes: MarketRoutes,
    walletRoutes: WalletRoutes,
    punterRoutes: PunterRoutes,
    geoComplyRoutes: GeoComplyRoutes,
    paymentRoutes: PaymentsRoutes,
    mountBackOfficeRoutes: MountPoint => BackofficeRoutes,
    extraEndpoints: Routes.Endpoints = List.empty)
    extends Routes {

  private val backofficeRoutes: BackofficeRoutes =
    mountBackOfficeRoutes(BackofficeRoutes.adminMountPoint)

  override val endpoints: Routes.Endpoints =
    punterRoutes.endpoints ++
    walletRoutes.endpoints ++
    marketRoutes.endpoints ++
    betRoutes.endpoints ++
    geoComplyRoutes.endpoints ++
    paymentRoutes.endpoints ++
    extraEndpoints ++
    backofficeRoutes.endpoints

  override val toAkkaHttp: Route = wrapWithCors(withLogging(toRoute(endpoints)))
}

object PhoenixRestRoutes {

  def create(
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
      multiFactorAuthenticationService: MultiFactorAuthenticationService,
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
      authenticator: JwtAuthenticator,
      system: ActorSystem[_],
      clock: Clock): PhoenixRestRoutes = {
    implicit val ec = system.executionContext
    val predictionQueries =
      if (predictionQueryService == PredictionReadModelService.noopQuery) predictionReadModels else predictionQueryService
    val predictionHistory =
      if (predictionHistoryLookup == PredictionReadModelService.noopQuery) predictionQueries else predictionHistoryLookup
    new PhoenixRestRoutes(
      new BetRoutes(
        bets,
        wallets,
        markets,
        punters,
        marketBetsRepository,
        punterStakeRepository,
        geolocationValidator,
        betsDomainConfig),
      new MarketRoutes(markets),
      new WalletRoutes(wallets, predictionHistory),
      new PunterRoutes(
        punters,
        wallets,
        bets,
        authenticationRepository,
        puntersRepository,
        puntersViewRepository,
        termsAndConditionsRepository,
        multiFactorAuthenticationService,
        accountVerificationCodeRepository,
        registrationEventRepository,
        limitsHistoryRepository,
        deviceFingerprintsRepository,
        coolOffsHistoryRepository,
        idComplyService,
        excludedPlayersRepository,
        mailer,
        noteModule.noteRepository,
        uuidGenerator,
        clock,
        puntersDomainConfig),
      geoComplyRoutes,
      paymentsRoutes,
      mountPoint =>
        new BackofficeRoutes(
          mountPoint,
          bets,
          markets,
          punters,
          wallets,
          authenticationRepository,
          puntersRepository,
          puntersViewRepository,
          limitsHistoryRepository,
          coolOffsHistoryRepository,
          auditLogBackofficeRoutes,
          noteModule.backofficeRoutes,
          termsAndConditionsRepository,
          marketsMigrator,
          excludedPlayersRepository,
          registrationEventRepository,
          reportsModule,
          predictionReadModels,
          predictionQueryService = predictionQueries,
          predictionProjectionService = predictionProjectionService,
          predictionHistoryLookup = predictionHistory),
      extraEndpoints =
        new PredictionBotRoutes().endpoints ++
          new PredictionPlayerRoutes(
            punters,
            wallets,
            predictionReadModels = predictionQueries,
            predictionProjectionService = predictionProjectionService).endpoints)
  }

  def wrapWithCors(route: Route): Route = {
    // This rather unusual construct (handleRejections applied twice) is implemented following
    // https://github.com/lomigmegard/akka-http-cors/blob/master/akka-http-cors-example/src/main/scala/ch/megard/akka/http/cors/scaladsl/CorsServer.scala

    // The outer handleRejections is responsible for converting the rejections
    // coming from failed OPTIONS preflight requests into a 400 response;
    // if it's missing, then each failure of preflight request will end up in a 500.
    handleRejections(corsRejectionHandler.withFallback(RejectionHandler.default)) {
      cors() {
        // The inner handleRejections is responsible for adding CORS headers into the rejections
        // stemming from unmatched route;
        // if it's missing, then no 404 or 405 response will ever have CORS headers.
        // Despite what akka-http-cors example suggests, it seems that corsRejectionHandler is redundant at this level.
        (handleRejections(RejectionHandler.default) & topLevelExceptionsHandler) {
          route
        }
      }
    }
  }

  private val topLevelExceptionsHandler: Directive0 = handleExceptions(ExceptionHandler {
    case throwable: Throwable =>
      complete(HttpResponse(StatusCodes.InternalServerError, entity = throwable.getMessage))
  })
}
