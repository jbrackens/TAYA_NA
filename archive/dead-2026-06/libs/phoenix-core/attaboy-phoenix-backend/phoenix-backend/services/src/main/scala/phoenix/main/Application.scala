package phoenix.main

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success

import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.ActorContext
import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.scaladsl.TimerScheduler
import akka.cluster.sharding.ClusterShardingHealthCheck
import akka.cluster.typed.Cluster
import akka.cluster.typed.SelfUp
import akka.cluster.typed.Subscribe
import com.google.common.util.concurrent.ThreadFactoryBuilder
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix._
import phoenix.auditlog.AuditLogModule
import phoenix.backoffice.ActorBackofficeBoundedContext
import phoenix.bets.ActorBetsBoundedContext
import phoenix.bets.AlwaysValidGeolocationValidator
import phoenix.bets.BetProjectionRunner
import phoenix.bets.BetsConfig
import phoenix.bets.GeolocationValidator
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStakeRepository
import phoenix.bets.infrastructure.SlickMarketBetsRepository
import phoenix.bets.infrastructure.SlickPunterStakesRepository
import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.core.deployment.DeploymentClock
import phoenix.core.deployment.DeploymentConfig
import phoenix.core.emailing.EmailingModule
import phoenix.core.scheduler.SchedulerModule
import phoenix.dbviews.DGEViewsModule
import phoenix.dbviews.infrastructure.SlickView01PatronDetailsRepository
import phoenix.geocomply.GeoComplyModule
import phoenix.http.DevHttpServer
import phoenix.http.PhoenixRestServer
import phoenix.http.core.AkkaHttpClient
import phoenix.http.routes.dev.DevRoutesConfiguration
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtConfig
import phoenix.keycloak.KeycloakConfig
import phoenix.keycloak.KeycloakTokenVerifier
import phoenix.main.Application._
import phoenix.markets.ActorMarketsBoundedContext
import phoenix.markets.MarketProjectionRunner
import phoenix.migrations.MarketsMigratorImpl
import phoenix.notes.NoteModule
import phoenix.payments.PaymentsModule
import phoenix.payments.infrastructure.http.PxpHttpServer
import phoenix.punters.ActorPuntersBoundedContext
import phoenix.punters.NotificationsConfig
import phoenix.punters.PuntersConfig
import phoenix.punters.domain._
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.infrastructure.SlickExcludedPlayersRepository
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.idcomply.infrastructure.AkkaHttpIdComplyService
import phoenix.punters.idcomply.infrastructure.RegistrationConfig
import phoenix.punters.idcomply.infrastructure.SlickRegistrationEventRepository
import phoenix.punters.infrastructure._
import phoenix.punters.infrastructure.twilio.TwilioConfig
import phoenix.punters.infrastructure.twilio.TwilioMultiFactorAuthenticationService
import phoenix.prediction.PredictionConfig
import phoenix.prediction.markets.PredictionMarketFactoryModule
import phoenix.reports.ProductionReportsModule
import phoenix.softplay.infrastructure.SlickSoftPlayRepository
import phoenix.suppliers.SupplierModule
import phoenix.suppliers.betgenius.BetgeniusModule
import phoenix.suppliers.mockdata.MockDataModule
import phoenix.suppliers.oddin.OddinModule
import phoenix.utils.RandomUUIDGenerator
import phoenix.utils.UUIDGenerator
import phoenix.wallets.ActorWalletsBoundedContext
import phoenix.wallets.WalletProjectionRunner
import phoenix.websockets.WebSocketServer
trait Application {

  def beforeApplicationStart(context: ActorContext[_]): Unit
  def afterApplicationStart(context: ActorContext[_]): Unit

  object RootBehavior {
    private val log = LoggerFactory.getLogger(this.objectName)

    def apply(httpPorts: HttpPorts): Behavior[RootCommand] =
      Behaviors.setup[RootCommand] { context =>
        Behaviors.withTimers { timers =>
          val cluster = Cluster(context.system)
          beforeApplicationStart(context)
          val upAdapter = context.messageAdapter[SelfUp](_ => NodeMemberUp)
          cluster.subscriptions ! Subscribe(upAdapter, classOf[SelfUp])

          waitingForClusterMembership(context, timers, httpPorts)
        }
      }

    def waitingForClusterMembership(
        context: ActorContext[RootCommand],
        timers: TimerScheduler[RootCommand],
        httpPorts: HttpPorts): Behavior[RootCommand] =
      Behaviors.receiveMessagePartial[RootCommand] {
        case NodeMemberUp =>
          log.info("Member has joined the cluster")
          startApplication(context, timers, httpPorts)
      }

    def startApplication(
        context: ActorContext[RootCommand],
        timers: TimerScheduler[RootCommand],
        httpPorts: HttpPorts): Behavior[RootCommand] = {
      log.info("Joined cluster. Starting Phoenix application")

      implicit val system: ActorSystem[_] = context.system
      implicit val ec: ExecutionContext = system.executionContext
      implicit val clock: Clock = DeploymentClock.fromConfig(DeploymentConfig.of(system))
      implicit val jwtAuthenticator: JwtAuthenticator =
        KeycloakTokenVerifier.build(JwtConfig.of(system), KeycloakConfig.of(system))

      // TODO (PHXD-1423): lone dependencies - to reorganize
      val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick", system.settings.config)
      val puntersConfig = PuntersConfig.of(system)
      val betsConfig = BetsConfig.of(system)
      val predictionConfig = PredictionConfig.of(system)
      val keycloakConfig = KeycloakConfig.of(system)
      val twilioConfig = TwilioConfig.of(system)
      val jwtConfig = JwtConfig.of(system)
      val uuidGenerator: UUIDGenerator = RandomUUIDGenerator
      val httpClient = new AkkaHttpClient(system.classicSystem)
      val notificationsConfig = NotificationsConfig.of(system)
      val devRoutesConfiguration = DevRoutesConfiguration.of(system)

      val blockingThreadFactory = new ThreadFactoryBuilder()
        .setDaemon(false)
        .setPriority(Thread.NORM_PRIORITY)
        .setNameFormat("blocking-ec-")
        .build()
      val blockingExecutionContext: ExecutionContext =
        ExecutionContext.fromExecutorService(Executors.newCachedThreadPool(blockingThreadFactory))

      val authenticationRepository: AuthenticationRepository = {
        new KeycloakAuthenticationRepository(keycloakConfig, httpClient)(system, blockingExecutionContext)
      }
      val puntersRepository: PuntersRepository =
        new SlickPuntersRepository(
          dbConfig,
          puntersConfig.ssnEncryptionPassword,
          KeycloakHelpers.additionalSsnLookup(authenticationRepository))
      val puntersViewRepository = new SlickView01PatronDetailsRepository(dbConfig, clock)
      val termsAndConditionsRepository: TermsAndConditionsRepository = new SlickTermsAndConditionsRepository(dbConfig)
      val mfaService: MultiFactorAuthenticationService =
        new TwilioMultiFactorAuthenticationService(httpClient, twilioConfig)
      val accountVerificationCodeRepository: AccountVerificationCodeRepository =
        new SlickAccountVerificationCodeRepository(dbConfig, clock)
      val geolocationValidator: GeolocationValidator = AlwaysValidGeolocationValidator
      val punterStakeRepository: PunterStakeRepository = new SlickPunterStakesRepository(dbConfig)
      val limitsHistoryRepository: PunterLimitsHistoryRepository = new SlickPunterLimitsHistoryRepository(dbConfig)
      val deviceFingerprintsRepository: PunterDeviceFingerprintsRepository =
        new SlickPunterDeviceFingerprintsRepository(dbConfig, clock)
      val coolOffsHistoryRepository: PunterCoolOffsHistoryRepository = new SlickPunterCoolOffsHistoryRepository(
        dbConfig)
      val marketBetsRepository: MarketBetsRepository = new SlickMarketBetsRepository(dbConfig)

      val registrationEventRepository: RegistrationEventRepository =
        new SlickRegistrationEventRepository(dbConfig)
      val idComplyService: IdComplyService = new AkkaHttpIdComplyService(httpClient, RegistrationConfig.of(system))
      val excludedPlayersRepository: ExcludedPlayersRepository = new SlickExcludedPlayersRepository(dbConfig, clock)

      // Modules
      val schedulerModule = SchedulerModule.init(clock)
      PredictionMarketFactoryModule.init(predictionConfig, schedulerModule.akkaJobScheduler, clock)
      val emailingModule = EmailingModule.init(notificationsConfig.email)
      val reportsModule =
        new ProductionReportsModule(
          clock,
          schedulerModule.akkaJobScheduler,
          emailingModule.mailer,
          dbConfig,
          puntersRepository)
      val geoComplyModule = GeoComplyModule.init(clock)
      val auditLogModule = AuditLogModule.init(dbConfig, clock)

      val walletProjectionRunner = WalletProjectionRunner.build(system, dbConfig)

      // TODO (PHXD-1423): BoundedContext - to reorganize
      val wallets = ActorWalletsBoundedContext(
        system,
        dbConfig,
        BetProjectionRunner.build(system, dbConfig),
        uuidGenerator,
        schedulerModule.akkaJobScheduler,
        walletProjectionRunner)

      val noteModule =
        NoteModule.init(system, puntersRepository, walletProjectionRunner, dbConfig, uuidGenerator, clock)

      val markets = ActorMarketsBoundedContext(system, dbConfig)

      val bets = ActorBetsBoundedContext(
        system,
        markets,
        marketBetsRepository,
        dbConfig,
        MarketProjectionRunner.build(system, dbConfig))

      val punters =
        ActorPuntersBoundedContext(
          puntersConfig,
          system,
          authenticationRepository,
          wallets,
          bets,
          emailingModule.mailer,
          termsAndConditionsRepository,
          excludedPlayersRepository,
          puntersRepository,
          dbConfig,
          clock,
          schedulerModule.akkaJobScheduler,
          uuidGenerator,
          walletProjectionRunner)

      DGEViewsModule.init(puntersRepository, punters, markets, bets, clock, dbConfig, system)

      ActorBackofficeBoundedContext.apply(
        system,
        dbConfig,
        BetProjectionRunner.build(system, dbConfig),
        walletProjectionRunner,
        punters,
        wallets,
        noteModule.noteRepository,
        uuidGenerator,
        clock)

      val paymentsModule =
        PaymentsModule.init(
          dbConfig,
          system,
          punters,
          wallets,
          authenticationRepository,
          puntersRepository,
          jwtAuthenticator,
          uuidGenerator,
          clock)

      //Servers
      val phoenixRestServer =
        PhoenixRestServer.create(
          port = httpPorts.forRestServer,
          bets,
          markets,
          wallets,
          punters,
          geoComplyModule.geoComplyRoutes,
          paymentsModule.routes.payments,
          authenticationRepository,
          puntersRepository,
          puntersViewRepository,
          termsAndConditionsRepository,
          mfaService,
          accountVerificationCodeRepository = accountVerificationCodeRepository,
          marketBetsRepository = marketBetsRepository,
          punterStakeRepository = punterStakeRepository,
          limitsHistoryRepository = limitsHistoryRepository,
          coolOffsHistoryRepository = coolOffsHistoryRepository,
          reportsModule = reportsModule,
          mailer = emailingModule.mailer,
          geolocationValidator = geolocationValidator,
          uuidGenerator = uuidGenerator,
          registrationEventRepository = registrationEventRepository,
          marketsMigrator = new MarketsMigratorImpl(dbConfig.db),
          idComplyService = idComplyService,
          excludedPlayersRepository = excludedPlayersRepository,
          auditLogBackofficeRoutes = auditLogModule.backofficeRoutes,
          noteModule = noteModule,
          puntersDomainConfig = puntersConfig.domain,
          betsDomainConfig = betsConfig.domain,
          deviceFingerprintsRepository = deviceFingerprintsRepository)
      phoenixRestServer.start()

      DevHttpServer
        .create(
          port = httpPorts.forDevServer,
          markets,
          punters,
          wallets,
          authenticationRepository,
          puntersRepository,
          termsAndConditionsRepository,
          new SlickSoftPlayRepository(dbConfig),
          devRoutesConfiguration,
          phoenixRestServer.swagger,
          puntersDomainConfig = puntersConfig.domain)
        .start()

      val supplierModules = List(
        BetgeniusModule.init(httpPorts.forBetgeniusServer, markets, context),
        OddinModule.init(markets, clock, context),
        MockDataModule.init(markets, context))

      WebSocketServer.start(
        port = httpPorts.forWebSockets,
        jwtConfig,
        keycloakConfig,
        uuidGenerator,
        dbConfig,
        markets,
        wallets)

      PxpHttpServer.create(paymentsModule.routes.pxp, port = httpPorts.forPxpServer).start()

      // Note that we can't use the dispatcher of this actor system as ExecutionContext,
      // since the actor system will have been shut down before the `system.whenTerminated` future completes.
      import dbConfig.db
      system.whenTerminated.onComplete(_ => db.close())(executor = ExecutionContext.global) // scalastyle:ignore regex

      waitingForShardRegion(context, timers, supplierModules)
    }

    def waitingForShardRegion(
        context: ActorContext[RootCommand],
        timers: TimerScheduler[RootCommand],
        supplierModules: Seq[SupplierModule]): Behavior[RootCommand] = {
      val getShardRegionStatus = new ClusterShardingHealthCheck(context.system.classicSystem)
      timers.startSingleTimer(CheckShardRegionStatus, 1.second)
      Behaviors.receiveMessagePartial[RootCommand] {
        case CheckShardRegionStatus =>
          context.pipeToSelf(getShardRegionStatus()) {
            case Success(result) =>
              if (result) {
                ShardRegionReady
              } else {
                ShardRegionNotReady
              }
            case Failure(exception) => FailedToGetShardRegionStatus(exception.getMessage)
          }
          Behaviors.same
        case FailedToGetShardRegionStatus(because) =>
          log.error(s"Failed to get shard region status '$because', shutting down...")
          context.system.terminate()
          Behaviors.ignore[RootCommand]
        case ShardRegionNotReady =>
          log.info("ShardRegion NOT ready, checking again...")
          timers.startSingleTimer(CheckShardRegionStatus, 1.second)
          Behaviors.same
        case ShardRegionReady =>
          log.info("ShardRegion ready, we're running...")
          afterApplicationStart(context)
          supplierModules.foreach(_.start())
          Behaviors.ignore
      }
    }
  }
}

object Application {
  sealed trait RootCommand extends CirceAkkaSerializable
  case object NodeMemberUp extends RootCommand
  case object CheckShardRegionStatus extends RootCommand
  case object ShardRegionReady extends RootCommand
  case object ShardRegionNotReady extends RootCommand
  case class FailedToGetShardRegionStatus(cause: String) extends RootCommand

  final case class HttpPorts(
      forRestServer: Int,
      forDevServer: Int,
      forWebSockets: Int,
      forBetgeniusServer: Int,
      forPxpServer: Int)
}
