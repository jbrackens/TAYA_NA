package phoenix.punters

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.Failure
import scala.util.Success

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.EntityRef
import akka.stream.Materializer
import akka.util.Timeout
import cats.data.EitherT
import cats.syntax.either._
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils._
import phoenix.core.emailing.Mailer
import phoenix.core.scheduler.AkkaScheduler
import phoenix.http.TrustingHttpClientProvider
import phoenix.http.core.IpAddress
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.projections.ProjectionRunner
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Commands._
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterProtocol.Responses.PunterResponse
import phoenix.punters.PunterProtocol.Responses.{Failure => failure}
import phoenix.punters.PunterProtocol.Responses.{Success => success}
import phoenix.punters.PunterState._
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters.application.RetrievePunterProfile
import phoenix.punters.application.es.CoolOffsHistoryHandler
import phoenix.punters.application.es.LimitsHistoryHandler
import phoenix.punters.application.es.PunterEventNotificationHandler
import phoenix.punters.application.es.PunterStatusEventHandler
import phoenix.punters.application.es.SessionLimitsHandler
import phoenix.punters.application.es.WalletEventNotificationHandler
import phoenix.punters.cooloff.PunterCoolOffModule
import phoenix.punters.domain.AccountVerificationCodeRepository
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.Limits
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.PunterStatus
import phoenix.punters.domain.PunterTimeRestrictedSessionsRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.domain.SuspensionEntity
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.exclusion.ExclusionModule
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.infrastructure.ExceededSessionsJob
import phoenix.punters.infrastructure.SlickAccountVerificationCodeRepository
import phoenix.punters.infrastructure.SlickPunterCoolOffsHistoryRepository
import phoenix.punters.infrastructure.SlickPunterLimitsHistoryRepository
import phoenix.punters.infrastructure.SlickPunterTimeRestrictedSessionsRepository
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletsBoundedContext

/**
 * Concrete Bounded Context definition based on actor system
 *
 * Calling PuntersBoundedContext(system) will:
 *
 * - initialize the required sharding region for the Punters to be referenced from
 * - return an instance of the Punters API that can be passed as a dependency to users
 */
private[this] class ActorPuntersBoundedContext(system: ActorSystem[_], clock: Clock) extends PuntersBoundedContext {
  import ActorPuntersBoundedContext._

  private val sharding = ClusterSharding(system)
  private val log = LoggerFactory.getLogger(getClass)
  private implicit val timeout: Timeout = Timeout(10.seconds)

  override def createUnverifiedPunterProfile(
      punterId: PunterId,
      depositLimits: Limits[DepositLimitAmount],
      stakeLimits: Limits[StakeLimitAmount],
      sessionLimits: Limits[SessionDuration],
      referralCode: Option[ReferralCode],
      isTestAccount: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileAlreadyExists, domain.PunterProfile] = {
    log.info(s"Running command ${CreatePunterProfile.simpleObjectName} for punter {}", kv("PunterId", punterId.value))

    runPunterCommandEither(
      punterId,
      replyTo =>
        CreatePunterProfile(
          punterId,
          depositLimits,
          stakeLimits,
          sessionLimits,
          referralCode,
          isTestAccount,
          replyTo)) {
      case success.ProfileCreated(_, profile) => toPublic(profile, clock).asRight
      case failure.AlreadyExists(id)          => PunterProfileAlreadyExists(id).asLeft
    }
  }

  def verifyPunter(id: PunterId, activationPath: ActivationPath)(implicit
      ec: ExecutionContext): EitherT[Future, PunterUnverifiedError, PunterVerified] =
    runPunterCommandEither[PunterUnverifiedError, PunterVerified](id, VerifyPunter(id, activationPath, _)) {
      case _: success.Verified     => PunterVerified(id).asRight
      case _: failure.DoesNotExist => PunterProfileDoesNotExist(id).asLeft
    }

  def unverifyPunter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterUnverified] =
    runPunterCommandEither[PunterProfileDoesNotExist, PunterUnverified](id, UnverifyPunter(id, _)) {
      case _: failure.DoesNotExist => PunterProfileDoesNotExist(id).asLeft
    }

  override def getPunterProfile(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, domain.PunterProfile] =
    runPunterCommandEither[PunterProfileDoesNotExist, domain.PunterProfile](
      id,
      replyTo => GetPunterProfile(id, replyTo)) {
      case success.PunterProfileResponse(_, profile) => toPublic(profile, clock).asRight
      case failure.DoesNotExist(id)                  => PunterProfileDoesNotExist(id).asLeft
    }

  override def beginCoolOff(id: PunterId, duration: FiniteDuration, cause: CoolOffCause)(implicit
      ec: ExecutionContext): EitherT[Future, PunterCoolOffError, PunterCoolOffBegan] =
    runPunterCommandEither[PunterCoolOffError, PunterCoolOffBegan](
      id,
      replyTo => BeginCoolOff(id, duration, cause, replyTo)) {
      case success.CoolOffBegan(_, coolOffPeriod) => PunterCoolOffBegan(id, toPublic(coolOffPeriod)).asRight
      case _: failure.DoesNotExist                => PunterProfileDoesNotExist(id).asLeft
      case _: failure.Suspended                   => PunterSuspendedError(id).asLeft
      case _: failure.InCoolOff                   => PunterInCoolOffError(id).asLeft
      case _: failure.SelfExcluded                => PunterInSelfExclusionError(id).asLeft
    }

  override def beginSelfExclusion(id: PunterId, selfExclusionOrigin: SelfExclusionOrigin)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit] =
    runPunterCommandEither[PunterSelfExclusionError, Unit](
      id,
      replyTo => BeginSelfExclusion(id, selfExclusionOrigin, replyTo)) {
      case success.SelfExclusionBegan(_) => ().asRight
      case _: failure.DoesNotExist       => PunterProfileDoesNotExist(id).asLeft
      case _: failure.SelfExcluded       => PunterInSelfExclusionError(id).asLeft
    }

  override def endSelfExclusion(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionEndError, Unit] =
    runPunterCommandEither[PunterSelfExclusionEndError, Unit](id, replyTo => EndSelfExclusion(id, replyTo)) {
      case _: success.SelfExclusionEnded => ().asRight
      case _: failure.DoesNotExist       => PunterProfileDoesNotExist(id).asLeft
      case _: failure.NotSelfExcluded    => PunterNotInSelfExclusionError(id).asLeft
      case _: failure.Suspended          => PunterSuspendedError(id).asLeft
    }

  override def endCoolOff(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, PunterCoolOffEndError, Unit] =
    runPunterCommandEither[PunterCoolOffEndError, Unit](id, replyTo => EndCoolOff(id, replyTo)) {
      case _: success.CoolOffEnded => ().asRight
      case _: failure.DoesNotExist => PunterProfileDoesNotExist(id).asLeft
      case _: failure.NotInCoolOff => PunterNotInCoolOffError(id).asLeft
      case _: failure.Suspended    => PunterSuspendedError(id).asLeft
      case _: failure.SelfExcluded => PunterInSelfExclusionError(id).asLeft
    }

  override def setDepositLimits(id: PunterId, limits: Limits[DepositLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetDepositLimitError, CurrentAndNextLimits[DepositLimitAmount]] =
    for {
      result <- runPunterCommandEither[PunterSetDepositLimitError, CurrentAndNextLimits[DepositLimitAmount]](
        id,
        replyTo => SetDepositLimits(id, limits, replyTo)) {
        case success.DepositLimitsSet(_, limits) => limits.asRight
        case _: failure.DoesNotExist             => PunterProfileDoesNotExist(id).asLeft
        case _: failure.InCoolOff                => PunterInCoolOffError(id).asLeft
        case _: failure.SelfExcluded             => PunterInSelfExclusionError(id).asLeft
        case _: failure.Suspended                => PunterSuspendedError(id).asLeft
      }
    } yield result

  override def setSessionLimits(id: PunterId, limits: Limits[SessionDuration])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetSessionLimitsError, CurrentAndNextLimits[SessionDuration]] =
    runPunterCommandEither[PunterSetSessionLimitsError, CurrentAndNextLimits[SessionDuration]](
      id,
      replyTo => SetSessionLimits(id, limits, replyTo)) {
      case success.SessionLimitsSet(_, limits) => limits.asRight
      case _: failure.DoesNotExist             => PunterProfileDoesNotExist(id).asLeft
      case _: failure.InCoolOff                => PunterInCoolOffError(id).asLeft
      case _: failure.SelfExcluded             => PunterInSelfExclusionError(id).asLeft
      case _: failure.Suspended                => PunterSuspendedError(id).asLeft
    }

  override def setStakeLimits(id: PunterId, stakeLimits: Limits[StakeLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetStakeLimitsError, CurrentAndNextLimits[StakeLimitAmount]] =
    runPunterCommandEither[PunterSetStakeLimitsError, CurrentAndNextLimits[StakeLimitAmount]](
      id,
      replyTo => SetStakeLimits(id, stakeLimits, replyTo)) {
      case success.StakeLimitsSet(_, limits) => limits.asRight
      case _: failure.DoesNotExist           => PunterProfileDoesNotExist(id).asLeft
      case _: failure.InCoolOff              => PunterInCoolOffError(id).asLeft
      case _: failure.SelfExcluded           => PunterInSelfExclusionError(id).asLeft
      case _: failure.Suspended              => PunterSuspendedError(id).asLeft
    }

  override def setNegativeBalance(id: PunterId, reason: SuspensionEntity, operationTime: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SetNegativeBalanceError, Unit] =
    runPunterCommandEither[SetNegativeBalanceError, Unit](
      id,
      replyTo => SetNegativeBalance(id, reason, operationTime, replyTo)) {
      case _: success.NegativeBalanceSet => ().asRight
      case _: failure.DoesNotExist       => PunterProfileDoesNotExist(id).asLeft
    }

  override def unsetNegativeBalance(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsetNegativeBalanceError, Unit] =
    runPunterCommandEither[UnsetNegativeBalanceError, Unit](id, replyTo => UnsetNegativeBalance(id, replyTo)) {
      case _: success.NegativeBalanceUnset => ().asRight
      case _: failure.DoesNotExist         => PunterProfileDoesNotExist(id).asLeft
    }

  override def suspend(id: PunterId, reason: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SuspendPunterError, Unit] =
    runPunterCommandEither[SuspendPunterError, Unit](id, replyTo => Suspend(id, reason, suspendedAt, replyTo)) {
      case _: success.Suspended        => ().asRight
      case _: failure.DoesNotExist     => PunterProfileDoesNotExist(id).asLeft
      case _: failure.AlreadySuspended => PunterAlreadySuspendedError(id).asLeft
      case _: failure.SelfExcluded     => PunterInSelfExclusionError(id).asLeft
    }

  override def unsuspend(id: PunterId, adminId: AdminId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] =
    runPunterCommandEither[UnsuspendPunterError, Unit](id, replyTo => Unsuspend(id, adminId, replyTo)) {
      case _: success.PunterUnsuspendStarted => ().asRight
      case _: failure.DoesNotExist           => PunterProfileDoesNotExist(id).asLeft
      case _: failure.NotSuspended           => PunterNotSuspendedError(id).asLeft
    }

  override def completeUnsuspend(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] =
    runPunterCommandEither[UnsuspendPunterError, Unit](id, replyTo => CompleteUnsuspend(id, replyTo)) {
      case _: success.PunterUnsuspendCompleted => ().asRight
      case _: failure.DoesNotExist             => PunterProfileDoesNotExist(id).asLeft
      case _: failure.NotSuspended             => PunterNotSuspendedError(id).asLeft
    }

  override def startSession(
      punterId: PunterId,
      sessionId: SessionId,
      refreshTokenTimeout: OffsetDateTime,
      ipAddress: Option[IpAddress])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSuspendedError, StartedSession] =
    runPunterCommandEither[PunterSuspendedError, StartedSession](
      punterId,
      replyTo => StartSession(punterId, sessionId, refreshTokenTimeout, ipAddress, replyTo)) {
      case success.SessionStartedResponse(_, session) => session.asRight
      case _: failure.Suspended                       => PunterSuspendedError(punterId).asLeft
    }

  override def keepaliveSession(punterId: PunterId, refreshTokenTimeout: OffsetDateTime)(implicit
      executionContext: ExecutionContext): EitherT[Future, KeepaliveSessionError, Unit] = {
    runPunterCommandEither[KeepaliveSessionError, Unit](
      punterId,
      replyTo => KeepaliveSession(punterId, refreshTokenTimeout, replyTo)) {
      case success.SessionKeepaliveResponse => ().asRight
      case failure.DoesNotExist(_)          => PunterProfileDoesNotExist(punterId).asLeft
      case failure.Suspended(_)             => PunterSuspendedError(punterId).asLeft
    }
  }

  override def endSession(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, EndSessionError, EndedSession] = {
    runPunterCommandEither[EndSessionError, EndedSession](punterId, replyTo => EndSession(punterId, replyTo)) {
      case success.SessionEndedResponse(_, session) => session.asRight
      case failure.DoesNotExist(_)                  => PunterProfileDoesNotExist(punterId).asLeft
      case failure.SessionNotFound(_)               => SessionNotFound.asLeft
    }
  }

  override def incrementLoginFailureCounter(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
    runPunterCommandEither(punterId, replyTo => IncrementLoginFailureCounter(punterId, replyTo)) {
      case success.IncrementLoginFailureCounterResponse(isPasswordResetRequired) =>
        PasswordResetRequired(isPasswordResetRequired).asRight
      case failure.DoesNotExist(_) => PunterProfileDoesNotExist(punterId).asLeft
    }

  override def recordFailedMFAAttempt(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
    runPunterCommandEither(punterId, replyTo => IncrementFailedMFAAttemptCounter(punterId, replyTo)) {
      case success.IncrementFailedMFAAttemptCounterResponse(isPasswordResetRequired) =>
        PasswordResetRequired(isPasswordResetRequired).asRight
      case failure.DoesNotExist(_) => PunterProfileDoesNotExist(punterId).asLeft
    }

  override def resetLoginContext(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] =
    runPunterCommandEither(punterId, replyTo => ResetLoginContext(punterId, replyTo)) {
      case _: success.LoginContextGotResetResponse => ().asRight
      case _: failure.DoesNotExist                 => PunterProfileDoesNotExist(punterId).asLeft
    }

  override def resetPunterState(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] =
    runPunterCommandEither(punterId, replyTo => ResetPunterState(punterId, replyTo)) {
      case _: success.PunterStateGotResetResponse => ().asRight
      case _: failure.DoesNotExist                => PunterProfileDoesNotExist(punterId).asLeft
    }

  private def runPunterCommandEither[L, R](punterId: PunterId, command: ActorRef[PunterResponse] => PunterCommand)(
      actorResponseHandler: PartialFunction[PunterResponse, Either[L, R]])(implicit
      ec: ExecutionContext): EitherT[Future, L, R] =
    EitherT(runPunterCommand(punterId, command)(actorResponseHandler))

  private def runPunterCommand[A](punterId: PunterId, command: ActorRef[PunterResponse] => PunterCommand)(
      actorResponseHandler: PartialFunction[PunterResponse, A])(implicit ec: ExecutionContext): Future[A] = {
    punterRef(punterId).ask(command).transformWith {
      case Success(response) =>
        actorResponseHandler
          .lift(response)
          .map(result => Future.successful(result))
          .getOrElse(
            Future.failed(UnexpectedPunterErrorException(new IllegalStateException(s"Received message $response"))))
      case Failure(exception) => Future.failed(UnexpectedPunterErrorException(exception))
    }
  }

  private def punterRef(punterId: PunterId): EntityRef[PunterCommand] =
    sharding.entityRefFor(PunterShardingRegion.TypeKey, punterId.value)
}

object ActorPuntersBoundedContext extends TrustingHttpClientProvider {
  private val log = LoggerFactory.getLogger(getClass)

  def apply(
      puntersConfig: PuntersConfig,
      system: ActorSystem[Nothing],
      authenticationRepository: AuthenticationRepository,
      walletsBoundedContext: WalletsBoundedContext,
      betsBoundedContext: BetsBoundedContext,
      mailer: Mailer,
      termsAndConditionsRepository: TermsAndConditionsRepository,
      excludedPlayersRepository: ExcludedPlayersRepository,
      puntersRepository: PuntersRepository,
      dbConfig: DatabaseConfig[JdbcProfile],
      clock: Clock,
      akkaJobScheduler: AkkaScheduler,
      uuidGenerator: UUIDGenerator,
      walletProjectionRunner: ProjectionRunner[WalletEvent]): PuntersBoundedContext = {
    apply(
      puntersConfig,
      system,
      authenticationRepository,
      walletsBoundedContext,
      mailer,
      termsAndConditionsRepository,
      excludedPlayersRepository,
      dbConfig,
      clock,
      akkaJobScheduler,
      uuidGenerator,
      walletProjectionRunner,
      puntersRepository,
      betsBoundedContext)
  }

  def apply(
      puntersConfig: PuntersConfig,
      system: ActorSystem[Nothing],
      authenticationRepository: AuthenticationRepository,
      walletsBoundedContext: WalletsBoundedContext,
      mailer: Mailer,
      termsAndConditionsRepository: TermsAndConditionsRepository,
      excludedPlayersRepository: ExcludedPlayersRepository,
      dbConfig: DatabaseConfig[JdbcProfile],
      clock: Clock,
      akkaJobScheduler: AkkaScheduler,
      uuidGenerator: UUIDGenerator,
      walletProjectionRunner: ProjectionRunner[WalletEvent],
      puntersRepository: PuntersRepository,
      betsBoundedContext: BetsBoundedContext): PuntersBoundedContext = {
    log.info("Punters BoundedContext starting...")

    val sessionsRepository = new SlickPunterTimeRestrictedSessionsRepository(dbConfig)(system.executionContext)
    val limitsHistoryRepository = new SlickPunterLimitsHistoryRepository(dbConfig)(system.executionContext)
    val coolOffsHistoryRepository = new SlickPunterCoolOffsHistoryRepository(dbConfig)
    val accountVerificationCodeRepository: AccountVerificationCodeRepository =
      new SlickAccountVerificationCodeRepository(dbConfig, clock)(system.executionContext)
    val notificationsConfig = NotificationsConfig.of(system)

    PunterShardingRegion.initSharding(system, clock)
    val puntersBoundedContext =
      new ActorPuntersBoundedContext(system, clock)
    val retrievePunterProfile =
      new RetrievePunterProfile(
        authenticationRepository,
        puntersBoundedContext,
        walletsBoundedContext,
        termsAndConditionsRepository,
        puntersRepository,
        clock)(system.executionContext)
    val puntersProjectionRunner = PuntersProjectionRunner.build(system, dbConfig)
    PunterCoolOffModule.init(puntersBoundedContext, system, dbConfig, puntersProjectionRunner, clock, akkaJobScheduler)
    ExclusionModule.init(
      dbConfig,
      puntersConfig,
      puntersProjectionRunner,
      excludedPlayersRepository,
      puntersRepository,
      authenticationRepository,
      puntersBoundedContext,
      betsBoundedContext,
      akkaJobScheduler,
      clock)(system.executionContext, Materializer(system))
    startNotifications(
      puntersProjectionRunner,
      walletProjectionRunner,
      retrievePunterProfile,
      mailer,
      accountVerificationCodeRepository,
      notificationsConfig.baseUrl,
      notificationsConfig.customerSupportContext,
      puntersConfig,
      system)
    startSessionEventHandler(puntersProjectionRunner, sessionsRepository, puntersConfig, system)
    startLimitsHistoryHandler(puntersProjectionRunner, limitsHistoryRepository, puntersConfig, system, clock)
    startCoolOffsHistoryHandler(puntersProjectionRunner, coolOffsHistoryRepository, puntersConfig, system)
    startPunterStatusHandler(
      puntersProjectionRunner,
      puntersConfig,
      puntersBoundedContext,
      walletsBoundedContext,
      authenticationRepository,
      uuidGenerator,
      system)
    startExceededSessionsCronJob(puntersBoundedContext, sessionsRepository, clock, puntersConfig, akkaJobScheduler)
    puntersBoundedContext
  }

  private def startNotifications(
      puntersProjectionRunner: ProjectionRunner[PunterEvent],
      walletsProjectionRunner: ProjectionRunner[WalletEvent],
      retrievePunterProfileUseCase: RetrievePunterProfile,
      mailer: Mailer,
      accountVerificationCodeRepository: AccountVerificationCodeRepository,
      appBaseUrl: PhoenixAppBaseUrl,
      customerSupport: CustomerSupportContext,
      puntersConfig: PuntersConfig,
      system: ActorSystem[Nothing]): Unit = {
    implicit val ec: ExecutionContext = system.executionContext
    val punterReader = (punterId: PunterId) => retrievePunterProfileUseCase.retrievePunterProfile(punterId)

    puntersProjectionRunner.runProjection(
      puntersConfig.projections.punterNotifications,
      new PunterEventNotificationHandler(
        punterReader,
        mailer,
        accountVerificationCodeRepository,
        appBaseUrl,
        customerSupport))

    walletsProjectionRunner.runProjection(
      puntersConfig.projections.walletNotifications,
      new WalletEventNotificationHandler(punterReader, mailer, appBaseUrl, customerSupport))
  }

  private def startSessionEventHandler(
      projectionRunner: ProjectionRunner[PunterEvent],
      sessionsRepository: PunterTimeRestrictedSessionsRepository,
      puntersConfig: PuntersConfig,
      system: ActorSystem[Nothing]): Unit = {
    implicit val ec: ExecutionContext = system.executionContext
    projectionRunner.runProjection(
      puntersConfig.projections.sessionLimits,
      new SessionLimitsHandler(sessionsRepository))
  }

  private def startLimitsHistoryHandler(
      projectionRunner: ProjectionRunner[PunterEvent],
      limitsRepository: PunterLimitsHistoryRepository,
      puntersConfig: PuntersConfig,
      system: ActorSystem[Nothing],
      clock: Clock): Unit = {
    implicit val ec: ExecutionContext = system.executionContext
    projectionRunner.runProjection(
      puntersConfig.projections.limitsHistory,
      new LimitsHistoryHandler(limitsRepository)(ec, clock))
  }

  private def startCoolOffsHistoryHandler(
      projectionRunner: ProjectionRunner[PunterEvent],
      coolOffsHistoryRepository: PunterCoolOffsHistoryRepository,
      puntersConfig: PuntersConfig,
      system: ActorSystem[Nothing]): Unit = {
    implicit val ec: ExecutionContext = system.executionContext
    projectionRunner.runProjection(
      puntersConfig.projections.coolOffsHistory,
      new CoolOffsHistoryHandler(coolOffsHistoryRepository))
  }

  private def startPunterStatusHandler(
      projectionRunner: ProjectionRunner[PunterEvent],
      puntersConfig: PuntersConfig,
      puntersBoundedContext: PuntersBoundedContext,
      walletsBoundedContext: WalletsBoundedContext,
      authenticationRepository: AuthenticationRepository,
      uuidGenerator: UUIDGenerator,
      system: ActorSystem[Nothing]): Unit = {
    implicit val ec: ExecutionContext = system.executionContext
    projectionRunner.runProjection(
      puntersConfig.projections.punterStatus,
      new PunterStatusEventHandler(
        puntersBoundedContext,
        walletsBoundedContext,
        uuidGenerator,
        authenticationRepository))
  }

  private def startExceededSessionsCronJob(
      punters: PuntersBoundedContext,
      sessions: PunterTimeRestrictedSessionsRepository,
      clock: Clock,
      puntersConfig: PuntersConfig,
      akkaJobScheduler: AkkaScheduler): Unit = {
    val job = new ExceededSessionsJob(punters, sessions, clock)
    akkaJobScheduler.scheduleJob(job, puntersConfig.sessionLimits.periodicWorker)
  }

  private def toPublic(internal: PunterProfile, clock: Clock): domain.PunterProfile = {
    val now = clock.currentOffsetDateTime()
    domain.PunterProfile(
      punterId = internal.data.punterId,
      depositLimits = internal.depositLimits(now, clock),
      sessionLimits = internal.sessionLimits(now, clock),
      stakeLimits = internal.stakeLimits(now, clock),
      status = internal match {
        case _: ActivePunter       => PunterStatus.Active
        case s: SuspendedPunter    => PunterStatus.Suspended(suspensionEntity = s.currentSuspension)
        case s: NegativeBalance    => PunterStatus.Suspended(suspensionEntity = SuspensionEntity.NegativeBalance(s.reason))
        case _: CoolOffPunter      => PunterStatus.InCoolOff
        case _: SelfExcludedPunter => PunterStatus.SelfExcluded
        case _: UnverifiedPunter   => PunterStatus.Unverified
      },
      exclusionStatus = internal match {
        case coolOffPunter: CoolOffPunter => Some(toPublic(coolOffPunter.coolOffInfo))
        case _                            => None
      },
      isTestAccount = internal.data.isTestAccount,
      endedSessions = toPublic(internal.sessions.getEndedSessions),
      maybeCurrentSession = internal.sessions.getCurrentSession.map(toPublic),
      passwordResetRequired = internal.data.passwordResetRequired,
      verifiedAt = internal.data.verifiedAt,
      activationPath = internal.data.activationPath)
  }

  private def toPublic(internal: CoolOffPeriod): domain.CoolOffPeriod =
    domain.CoolOffPeriod(internal.startTime, internal.endTime)

  private def toPublic(internal: CoolOffInfo): domain.CoolOffStatus =
    domain.CoolOffStatus(domain.CoolOffPeriod(internal.period.startTime, internal.period.endTime), internal.cause)

  private def toPublic(internalSession: PunterState.StartedSession): domain.StartedSession =
    domain.StartedSession(internalSession.sessionId, internalSession.startedAt, internalSession.ipAddress)

  private def toPublic(internalSessions: List[PunterState.EndedSession]): List[domain.EndedSession] =
    internalSessions.map(
      internalSession =>
        domain.EndedSession(
          internalSession.sessionId,
          startedAt = internalSession.startedAt,
          endedAt = internalSession.endedAt))
}
