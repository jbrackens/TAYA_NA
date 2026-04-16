package phoenix.punters

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.GivenWhenThen
import org.scalatest.Inside
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.support.BetsBoundedContextMock
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.emailing.ContentRenderer
import phoenix.core.emailing.EmailContentTemplate
import phoenix.core.emailing.EmailMessage
import phoenix.core.emailing.EmailingModule
import phoenix.core.emailing.HtmlEmailContent
import phoenix.core.scheduler.SchedulerModule
import phoenix.punters.PunterDataGenerator.Api._
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.Limits
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PunterStatus
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.support.AccountVerificationCodeRepositoryStub
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletProjectionRunner

final class ActorPuntersBoundedContextTransitionsSpec
    extends ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with GivenWhenThen
    with Inside {

  implicit val clock: Clock = Clock.utcClock
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)
  val accountVerificationCodeRepository = new AccountVerificationCodeRepositoryStub(clock)()
  val authenticationRepository = new TestAuthenticationRepository() {
    override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] =
      Future.successful(Some(generateRegisteredUserKeycloak()))
  }
  val emptyContentRenderer = new ContentRenderer {
    def render(contentTemplate: EmailContentTemplate)(implicit ec: ExecutionContext): Future[HtmlEmailContent] =
      Future.successful(HtmlEmailContent(""))
  }
  val punters: PuntersBoundedContext = ActorPuntersBoundedContext(
    PuntersConfig.of(system),
    system,
    authenticationRepository,
    new WalletContextProviderSuccess(clock),
    BetsBoundedContextMock.betsWithDomainFailureMock,
    EmailingModule.init((_: EmailMessage) => Future.unit, emptyContentRenderer).mailer,
    new TermsAndConditionsRepositoryMock(),
    new InMemoryExcludedPlayersRepository(),
    new InMemoryPuntersRepository(),
    dbConfig,
    clock,
    schedulerModule.akkaJobScheduler,
    RandomUUIDGenerator,
    WalletProjectionRunner.build(system, dbConfig))

  "suspend -> cool-off transition" should {
    val punterId = generatePunterId()
    def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status
    "fail" in {
      Given("suspended punter")
      awaitRight(createActivePunterProfile(punterId))
      awaitRight(punters.suspend(punterId, OperatorSuspend("because reasons"), suspendedAt = randomOffsetDateTime()))
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because reasons"))

      When("cool-off command received")
      val duration = generateCoolOffDuration()
      Then("it should be rejected with PunterSuspendedError")
      awaitLeft(punters.beginCoolOff(punterId, duration, CoolOffCause.SelfInitiated)) shouldBe PunterSuspendedError(
        punterId)

    }
  }

  "self-excluded -> cool-off transition" should {
    val punterId = generatePunterId()
    def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status
    "fail" in {
      Given("self-excluded punter")
      awaitRight(createActivePunterProfile(punterId))
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("cool-off command received")
      val duration = generateCoolOffDuration()
      Then("it should be rejected with PunterInSelfExclusionError")
      awaitLeft(
        punters.beginCoolOff(punterId, duration, CoolOffCause.SelfInitiated)) shouldBe PunterInSelfExclusionError(
        punterId)

    }
  }

  "self-excluded -> suspend transition" should {
    val punterId = generatePunterId()
    def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status
    "fail" in {
      Given("self-excluded punter")
      awaitRight(createActivePunterProfile(punterId))
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("suspend command received")
      Then("it should be rejected with PunterInSelfExclusionError")
      awaitLeft(
        punters.suspend(
          punterId,
          OperatorSuspend("because reasons"),
          suspendedAt = randomOffsetDateTime())) shouldBe PunterInSelfExclusionError(punterId)
    }
  }

  "active -> cool-off -> suspend -> self-exclusion -> suspend -> cool-off -> active transitions" should {
    val punterId = generatePunterId()
    "be properly performed" in {

      def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status

      Given("active punter")
      awaitRight(createActivePunterProfile(punterId))

      When("cool-off command received")
      val duration = generateCoolOffDuration()
      awaitRight(punters.beginCoolOff(punterId, duration, CoolOffCause.SelfInitiated))
      Then("transit to cool-off state")
      punterStatus() shouldBe PunterStatus.InCoolOff

      When("regulator-suspend command received")
      awaitRight(
        punters.suspend(punterId, OperatorSuspend("because other reasons"), suspendedAt = randomOffsetDateTime()))
      Then("transit to suspend state")
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))

      When("begin-of-self-exclusion command received")
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      Then("transit to self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("end-of-self-exclusion command received")
      awaitRight(punters.endSelfExclusion(punterId))
      Then("transit to suspend state")
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))

      When("complete end-of-suspend command received")
      awaitRight(punters.completeUnsuspend(punterId))
      Then("transit to cool-off state")
      punterStatus() shouldBe PunterStatus.InCoolOff

      When("end-of-cool-off command received")
      awaitRight(punters.endCoolOff(punterId))
      Then("transit to active state")
      punterStatus() shouldBe PunterStatus.Active
    }
  }

  "active -> cool-off -> self-exclusion -> cool-off -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status

      Given("active punter")
      awaitRight(createActivePunterProfile(punterId))

      When("cool-off command received")
      val duration = generateCoolOffDuration()
      awaitRight(punters.beginCoolOff(punterId, duration, CoolOffCause.SelfInitiated))
      Then("transit to cool-off state")
      punterStatus() shouldBe PunterStatus.InCoolOff

      When("begin-of-self-exclusion command received")
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      Then("transit to self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("end-of-self-exclusion command received")
      awaitRight(punters.endSelfExclusion(punterId))
      Then("transit to in-cool-off state")
      punterStatus() shouldBe PunterStatus.InCoolOff

      When("end-of-cool-off command received")
      awaitRight(punters.endCoolOff(punterId))
      Then("transit to active state")
      punterStatus() shouldBe PunterStatus.Active
    }
  }

  "active -> suspend -> self-exclusion -> suspend -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status

      Given("active punter")
      awaitRight(createActivePunterProfile(punterId))

      When("regulator-suspend command received")
      awaitRight(
        punters.suspend(punterId, OperatorSuspend("because other reasons"), suspendedAt = randomOffsetDateTime()))
      Then("transit to suspend state")
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))

      When("begin-of-self-exclusion command received")
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      Then("transit to self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("end-of-self-exclusion command received")
      awaitRight(punters.endSelfExclusion(punterId))
      Then("transit to suspend state")
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))

      When("complete end-of-suspend command received")
      awaitRight(punters.completeUnsuspend(punterId))
      Then("transit to active state")
      punterStatus() shouldBe PunterStatus.Active
    }
  }

  "active -> self-exclusion -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status

      Given("active punter")
      awaitRight(createActivePunterProfile(punterId))

      When("begin-of-self-exclusion command received")
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      Then("transit to self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("end-of-self-exclusion command received")
      awaitRight(punters.endSelfExclusion(punterId))
      Then("transit to active state")
      punterStatus() shouldBe PunterStatus.Active
    }
  }

  "active -> cool-off -> self-exclusion -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterStatus() = awaitRight(punters.getPunterProfile(punterId)).status

      Given("active punter")
      awaitRight(createActivePunterProfile(punterId))

      When("cool-off command received")
      val duration = generateCoolOffDuration()
      awaitRight(punters.beginCoolOff(punterId, duration, CoolOffCause.SelfInitiated))
      Then("transit to cool-off state")
      punterStatus() shouldBe PunterStatus.InCoolOff

      When("begin-of-self-exclusion command received")
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      Then("transit to self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("end-of-cool-off command received")
      awaitRight(punters.endCoolOff(punterId))
      Then("clean-up cool-off but stay in self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("end-of-self-exclusion command received")
      awaitRight(punters.endSelfExclusion(punterId))
      Then("transit to active state")
      punterStatus() shouldBe PunterStatus.Active
    }
  }

  "active -> suspend -> self-exclusion -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))
      def punterStatus() = punterProfile().status

      Given("active punter")
      awaitRight(createActivePunterProfile(punterId))
      val activePunterVerifiedDate = punterProfile().verifiedAt

      When("regulator-suspend command received")
      awaitRight(
        punters.suspend(punterId, OperatorSuspend("because other reasons"), suspendedAt = randomOffsetDateTime()))
      Then("transit to suspend state")
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))

      When("begin-of-self-exclusion command received")
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))
      Then("transit to self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("complete end-of-suspend command received")
      awaitRight(punters.completeUnsuspend(punterId))
      Then("clean-up suspension but stay in self-excluded state")
      punterStatus() shouldBe PunterStatus.SelfExcluded

      When("end-of-self-exclusion command received")
      awaitRight(punters.endSelfExclusion(punterId))
      Then("transit to active state")
      punterStatus() shouldBe PunterStatus.Active

      When("punter transited from suspent to active")
      val profileAfterTransition = punterProfile()
      Then("verifiedAt is NOT overridden in transitions")
      profileAfterTransition.verifiedAt.isDefined shouldBe true
      profileAfterTransition.verifiedAt shouldBe activePunterVerifiedDate
    }
  }

  "active -> cool-off -> suspend -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))
      def punterStatus() = punterProfile().status

      Given("active punter")
      awaitRight(createActivePunterProfile(punterId))

      When("cool-off command received")
      val duration = generateCoolOffDuration()
      awaitRight(punters.beginCoolOff(punterId, duration, CoolOffCause.SelfInitiated))
      Then("transit to cool-off state")
      punterStatus() shouldBe PunterStatus.InCoolOff

      When("regulator-suspend command received")
      awaitRight(
        punters.suspend(punterId, OperatorSuspend("because other reasons"), suspendedAt = randomOffsetDateTime()))
      Then("transit to suspend state")
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))

      When("end-of-cool-off command received")
      awaitRight(punters.endCoolOff(punterId))
      Then("clean-up cool-off but stay in suspended state")
      punterStatus() shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))

      When("complete end-of-suspend command received")
      awaitRight(punters.completeUnsuspend(punterId))
      Then("transit to active state")
      punterStatus() shouldBe PunterStatus.Active
      punterProfile().verifiedAt.isDefined shouldBe true
    }
  }

  "unverified -> suspend -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))

      Given("unverified punter")
      awaitRight(createUnverifiedPunterProfile(punterId))

      When("regulator-suspend command received")
      awaitRight(
        punters.suspend(punterId, OperatorSuspend("because other reasons"), suspendedAt = randomOffsetDateTime()))
      Then("transit to suspend state")
      punterProfile().status shouldBe PunterStatus.Suspended(OperatorSuspend("because other reasons"))
      punterProfile().verifiedAt shouldBe None

      When("complete end-of-suspend command received")
      awaitRight(punters.completeUnsuspend(punterId))
      Then("transit to active state")
      punterProfile().status shouldBe PunterStatus.Active
      punterProfile().verifiedAt.isDefined shouldBe true
    }
  }

  "unverified -> active transitions" should {
    "be properly performed" in {
      val punterId = generatePunterId()
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))

      Given("unverified punter")
      awaitRight(createUnverifiedPunterProfile(punterId))
      val profileBeforeTransition = punterProfile()
      profileBeforeTransition.status shouldBe PunterStatus.Unverified

      When("verify command received")
      awaitRight(punters.verifyPunter(punterId, ActivationPath.IDPV))
      Then("transit to active state")
      val profileAfterTransition = punterProfile()
      profileAfterTransition.status shouldBe PunterStatus.Active
    }
  }

  "unverified punter" should {
    "transit to active on verify" in {
      val punterId = generatePunterId()
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))

      Given("unverified punter")
      awaitRight(createUnverifiedPunterProfile(punterId))
      val profileBeforeTransition = punterProfile()
      profileBeforeTransition.status shouldBe PunterStatus.Unverified
      profileBeforeTransition.verifiedAt shouldBe None

      When("verify command received")
      awaitRight(punters.verifyPunter(punterId, ActivationPath.IDPV))
      Then("transit to active state")
      val profileAfterTransition = punterProfile()
      profileAfterTransition.status shouldBe PunterStatus.Active
      profileAfterTransition.verifiedAt.isDefined shouldBe true
    }
  }

  "active -> self-excluded -> negative-balance -> active transition" should {
    "be properly performed" in {
      Given("active punter")
      val punterId = generatePunterId()
      awaitRight(createActivePunterProfile(punterId))
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))
      punterProfile().status shouldBe PunterStatus.Active

      When("begin-of-self-exclusion command received")
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

      Then("transit to self-excluded state")
      punterProfile().status shouldBe PunterStatus.SelfExcluded

      When("negative balance command received")
      awaitRight(punters.setNegativeBalance(punterId, NegativeBalance("reason"), randomOffsetDateTime()))

      Then("transit to negative balance state")
      punterProfile().status shouldBe PunterStatus.Suspended(NegativeBalance("reason"))

      When("complete end-of-negative-balance command received")
      awaitRight(punters.unsetNegativeBalance(punterId))
      punterProfile().status shouldBe PunterStatus.SelfExcluded

      When("end-of-self-exclusion command received")
      awaitRight(punters.endSelfExclusion(punterId))

      Then("transit to active state")
      val profileAfterTransition = punterProfile()
      profileAfterTransition.status shouldBe PunterStatus.Active
      profileAfterTransition.verifiedAt.isDefined shouldBe true
    }
  }

  "self-excluded -> negative balance -> self-excluded transition" should {
    "be properly performed" in {
      Given("self-excluded punter")
      val punterId = generatePunterId()
      awaitRight(selfExcludePunterProfile(punterId))
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))

      When("negative balance command received")
      awaitRight(punters.setNegativeBalance(punterId, NegativeBalance("reason"), randomOffsetDateTime()))

      Then("transit to negative balance state")
      punterProfile().status shouldBe PunterStatus.Suspended(NegativeBalance("reason"))

      When("complete end-of-negative-balance command received")
      awaitRight(punters.unsetNegativeBalance(punterId))

      Then("transit to self-excluded")
      punterProfile().status shouldBe PunterStatus.SelfExcluded
      punterProfile().verifiedAt.isDefined shouldBe true
    }
  }

  "active punter -> cool-off -> negative balance -> cool-off transition" should {
    "be properly performed" in {
      Given("active punter punter")
      val punterId = generatePunterId()
      awaitRight(createActivePunterProfile(punterId))
      def punterProfile() = awaitRight(punters.getPunterProfile(punterId))

      When("cool-off command received")
      val duration = generateCoolOffDuration()
      awaitRight(punters.beginCoolOff(punterId, duration, CoolOffCause.SelfInitiated))

      Then("transit to cool-off state")
      punterProfile().status shouldBe PunterStatus.InCoolOff

      When("negative balance command received")
      awaitRight(punters.setNegativeBalance(punterId, NegativeBalance("reason"), randomOffsetDateTime()))

      Then("transit to negative balance state")
      punterProfile().status shouldBe PunterStatus.Suspended(NegativeBalance("reason"))

      When("complete end-of-negative-balance command received")
      awaitRight(punters.unsetNegativeBalance(punterId))

      Then("transit to cool-off")
      punterProfile().status shouldBe PunterStatus.InCoolOff
    }
  }

  private def selfExcludePunterProfile(punterId: PunterId): EitherT[Future, String, PunterProfile] =
    for {
      profile <- createUnverifiedPunterProfile(punterId).leftMap(_.toString)
      _ <- punters.verifyPunter(punterId, ActivationPath.IDPV).leftMap(_.toString)
      _ <-
        punters
          .beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear))
          .leftMap(_.toString)
    } yield profile

  private def createActivePunterProfile(punterId: PunterId): EitherT[Future, String, PunterProfile] =
    for {
      profile <- createUnverifiedPunterProfile(punterId).leftMap(_.toString)
      _ <- punters.verifyPunter(punterId, ActivationPath.IDPV).leftMap(_.toString)
    } yield profile

  private def createUnverifiedPunterProfile(
      punterId: PunterId): EitherT[Future, PunterProfileAlreadyExists, PunterProfile] =
    punters.createUnverifiedPunterProfile(
      punterId,
      depositLimits = Limits.none,
      stakeLimits = Limits.none,
      sessionLimits = Limits.none,
      referralCode = None,
      isTestAccount = false)

}
