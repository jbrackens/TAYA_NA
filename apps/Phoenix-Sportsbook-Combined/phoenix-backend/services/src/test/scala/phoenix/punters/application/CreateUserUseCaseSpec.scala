package phoenix.punters.application

import scala.concurrent.Future

import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.support.BetsBoundedContextMock
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.core.scheduler.SchedulerModule
import phoenix.punters.ActorPuntersBoundedContext
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.application.RegistrationSignUp
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.infrastructure.SlickPunterTimeRestrictedSessionsRepository
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CreateBackofficeUserRequest
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UserGenerator.generateEmail
import phoenix.support.UserGenerator.generatePersonalName
import phoenix.support.UserGenerator.generateUsername
import phoenix.time.FakeHardcodedClock
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletProjectionRunner

class CreateUserUseCaseSpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with Eventually {

  implicit val eventuallyPatience = PatienceConfig(scaled(Span(30, Seconds)), scaled(Span(1, Seconds)))

  implicit val clock = new FakeHardcodedClock()
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)

  val authenticationRepository: AuthenticationRepository = new TestAuthenticationRepository() {
    override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] =
      Future.successful(Some(generateRegisteredUserKeycloak()))
  }

  val punterTimeRestrictedSessionRepository = new SlickPunterTimeRestrictedSessionsRepository(dbConfig)

  val uuidGenerator = ConstantUUIDGenerator

  val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock()

  val puntersRepository = new InMemoryPuntersRepository()

  val registrationEventRepository = new InMemoryRegistrationEventRepository()

  val puntersBC: PuntersBoundedContext = ActorPuntersBoundedContext(
    PuntersConfig.of(system),
    system,
    authenticationRepository,
    new WalletContextProviderSuccess(clock),
    BetsBoundedContextMock.betsWithDomainFailureMock,
    EmailingModule.init(new EmailSenderStub()).mailer,
    termsAndConditionsRepository,
    new InMemoryExcludedPlayersRepository(),
    puntersRepository,
    dbConfig,
    clock,
    schedulerModule.akkaJobScheduler,
    RandomUUIDGenerator,
    WalletProjectionRunner.build(system, dbConfig))

  val createUserUseCase =
    new CreateUserUseCase(
      authenticationRepository,
      puntersRepository,
      puntersBC,
      registrationEventRepository,
      termsAndConditionsRepository)

  "Create backoffice user" should {
    val predefRequest = CreateBackofficeUserRequest(generateEmail(), generateUsername(), generatePersonalName())
    "start tracking refresh token timeout" in {
      // when
      awaitRight(createUserUseCase.createUser(predefRequest))

      // then
      eventually {
        val result = await(puntersRepository.countPuntersWithStartedRegistration())
        result should be > 0
      }
    }

    "return error if punter has already existed" in {
      // when
      val error = awaitLeft(createUserUseCase.createUser(predefRequest))

      // then
      error shouldBe RegistrationSignUp.ConflictingPunterInformation
    }
  }
}
