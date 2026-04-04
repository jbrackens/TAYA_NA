package phoenix.punters.integration
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

import cats.syntax.applicativeError._
import monocle.Monocle.toAppliedFocusOps
import org.keycloak.OAuth2Constants
import org.keycloak.admin.client.CreatedResponseUtil
import org.keycloak.admin.client.KeycloakBuilder
import org.keycloak.representations.idm.UserSessionRepresentation
import org.scalatest.EitherValues
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.scheduler.SchedulerModule
import phoenix.http.core.AkkaHttpClient
import phoenix.jwt.KeycloakInstallation
import phoenix.keycloak.KeycloakConfig
import phoenix.keycloak.KeycloakUtils.Groups
import phoenix.keycloak.KeycloakUtils.createClient
import phoenix.punters.KeycloakUser
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.AuthenticationRepository.Errors.InvalidRefreshToken
import phoenix.punters.domain.AuthenticationRepository.Errors.UnauthorizedLoginError
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain._
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.randomString
import phoenix.support.DataGenerator.randomUserDetailsKeycloak
import phoenix.support.DataGenerator.randomValidPassword
import phoenix.support.FutureSupport
import phoenix.testcontainers.Keycloak

final class KeycloakAuthenticationRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with ActorSystemIntegrationSpec
    with Matchers
    with FutureSupport
    with EitherValues {

  private val clock = Clock.utcClock
  private val keycloakConfig = Keycloak.instance.initNewRealm().config
  private val authenticationRepo: AuthenticationRepository =
    new KeycloakAuthenticationRepository(keycloakConfig, new AkkaHttpClient(system.classicSystem))(
      system,
      system.executionContext)
  private val testKeycloakRepo = new KeycloakTestRepository(keycloakConfig)
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)

  "should be able to register user with email lowercased" in {
    // given
    val userDetails =
      randomUserDetailsKeycloak().focus(_.email.value).modify(_.toUpperCase)
    val password = randomValidPassword()

    // when
    val punterId = await(authenticationRepo.register(userDetails, password))

    // then
    await(authenticationRepo.userExists(UserLookupId.byEmail(userDetails.email))) shouldBe true

    // and
    val registeredUser = await(authenticationRepo.findUser(UserLookupId.byPunterId(punterId))).get
    registeredUser shouldBe RegisteredUserKeycloak(UserId(UUID.fromString(punterId.value)), userDetails, admin = false)

    userDetails.email.value shouldNot equal(registeredUser.details.email.value)
    userDetails.email.value.toLowerCase should ===(registeredUser.details.email.value)
  }

  "should fail when register user twice" in {
    // given
    val userDetails = randomUserDetailsKeycloak()
    val password = randomValidPassword()

    // when
    await(authenticationRepo.register(userDetails, password))

    awaitLeft(authenticationRepo.register(userDetails, password).attemptT)
  }

  "should not find unregistered user" in {
    // given
    val userDetails = randomUserDetailsKeycloak()

    // then
    await(authenticationRepo.userExists(UserLookupId.byEmail(userDetails.email))) shouldBe false

    // then
    await(authenticationRepo.userExists(UserLookupId.byUsername(userDetails.userName))) shouldBe false

  }

  "should be able to verify account email" in {
    // given
    val userDetails = randomUserDetailsKeycloak()
    val punterId = await(authenticationRepo.register(userDetails, randomValidPassword()))

    // when
    await(authenticationRepo.verifyEmail(punterId))

    // then
    val registeredUser = await(authenticationRepo.findUser(UserLookupId.byPunterId(punterId)))
    registeredUser.map(_.details.isEmailVerified) shouldBe Some(true)
  }

  "should be able to change user details" in {
    // given
    val userDetails = randomUserDetailsKeycloak()
    val punterId = await(authenticationRepo.register(userDetails, randomValidPassword()))

    // when
    val updatedDetails = randomUserDetailsKeycloak().copy(userName = userDetails.userName)
    await(authenticationRepo.updateUser(punterId, updatedDetails))
    val detailsKeptByKeycloak = updatedDetails

    // then
    val updatedUser = await(authenticationRepo.findUser(UserLookupId.byPunterId(punterId)))
    updatedUser shouldBe Some(
      RegisteredUserKeycloak(UserId(UUID.fromString(punterId.value)), detailsKeptByKeycloak, admin = false))
  }

  "should allow finding user by email in a case-insensitive way" in {
    // given
    val firstUser = randomUserDetailsKeycloak()
    val firstPunterId =
      await(authenticationRepo.register(firstUser, randomValidPassword()))

    // and
    val secondUser = randomUserDetailsKeycloak()
    await(authenticationRepo.register(secondUser, randomValidPassword()))

    // when
    val firstUserEmailUpcased = firstUser.email.focus(_.value).modify(_.toUpperCase)
    firstUserEmailUpcased.value shouldNot equal(firstUser.email.value)
    val result = await(authenticationRepo.findUser(UserLookupId.byEmail(firstUserEmailUpcased))).map(_.userId)
    result shouldBe Some(UserId(UUID.fromString(firstPunterId.value)))
  }

  "should allow finding user by username" in {
    // given
    val firstUser = randomUserDetailsKeycloak()
    val firstPunterId = await(authenticationRepo.register(firstUser, randomValidPassword()))

    // and
    val secondUser = randomUserDetailsKeycloak()
    await(authenticationRepo.register(secondUser, randomValidPassword()))

    // when
    val result = await(authenticationRepo.findUser(UserLookupId.byUsername(firstUser.userName))).map(_.userId)

    // then
    result shouldBe Some(UserId(UUID.fromString(firstPunterId.value)))
  }

  "registered user should be able to sign in when using correct password" in {
    // given
    val userDetails = DataGenerator.randomUserDetailsKeycloak()
    val password = DataGenerator.randomValidPassword()
    await(testKeycloakRepo.register(userDetails, password))

    // when
    val loginResult = await(authenticationRepo.signIn(userDetails.userName, MaybeValidPassword(password.value)).value)

    // then
    loginResult shouldBe a[Right[_, _]]
  }

  "registered user should NOT be able to sign in when using a non matching password" in {
    // given
    val userDetails = DataGenerator.randomUserDetailsKeycloak()
    val password = DataGenerator.randomValidPassword()
    await(testKeycloakRepo.register(userDetails, password))

    // when
    val nonMatchingPassword = ValidPassword(password.value + "-WRONG")
    val loginResult =
      await(authenticationRepo.signIn(userDetails.userName, MaybeValidPassword(nonMatchingPassword.value)).value)

    // then
    loginResult.left.value shouldBe a[UnauthorizedLoginError.type]
  }

  "should delete user sessions when signing out" in {
    // given
    val userDetails = DataGenerator.randomUserDetailsKeycloak()
    val password = DataGenerator.randomValidPassword()
    val punterId = await(testKeycloakRepo.register(userDetails, password))

    // and
    awaitRight(authenticationRepo.signIn(userDetails.userName, MaybeValidPassword(password.value)))

    // and
    testKeycloakRepo.findSessions(punterId) should not be empty

    // when
    await(authenticationRepo.signOut(punterId))

    // then
    testKeycloakRepo.findSessions(punterId) shouldBe empty
  }

  "registered user should be able to change his password with valid password" in {
    // given
    val userDetails = randomUserDetailsKeycloak()
    val oldPassword = randomValidPassword()
    val punterId = await(authenticationRepo.register(userDetails, oldPassword))

    // when
    val newPassword = randomValidPassword()
    awaitRight(authenticationRepo.changePassword(punterId, newPassword))

    // then
    awaitRight(authenticationRepo.signIn(userDetails.userName, MaybeValidPassword(newPassword.value)))

    // and
    awaitLeft(authenticationRepo.signIn(userDetails.userName, MaybeValidPassword(oldPassword.value)))
  }

  "should allow refreshing tokens" in {
    // given
    val userDetails = randomUserDetailsKeycloak()
    val password = randomValidPassword()
    await(authenticationRepo.register(userDetails, password))

    // and
    val loginResponse = awaitRight(authenticationRepo.signIn(userDetails.userName, MaybeValidPassword(password.value)))

    // when
    val refreshAttempt = awaitRight(authenticationRepo.refreshToken(loginResponse.refreshToken))

    // then
    refreshAttempt.token should not be loginResponse.token
  }

  "should fail a refresh when an invalid refresh token is passed" in {
    // given
    val userDetails = randomUserDetailsKeycloak()
    val password = randomValidPassword()
    await(authenticationRepo.register(userDetails, password))

    // and
    awaitRight(authenticationRepo.signIn(userDetails.userName, MaybeValidPassword(password.value)))

    // when
    val refreshAttempt = awaitLeft(authenticationRepo.refreshToken(RefreshToken(randomString())))

    // then
    refreshAttempt shouldBe InvalidRefreshToken
  }
}

private final class KeycloakTestRepository(config: KeycloakConfig)(implicit ec: ExecutionContext) {

  private val installation = KeycloakInstallation.load(config.clientConfLocation)
  private val keycloakClient = KeycloakBuilder
    .builder()
    .serverUrl(installation.authServerUrl)
    .realm(installation.realm)
    .grantType(OAuth2Constants.CLIENT_CREDENTIALS)
    .clientId(installation.clientId)
    .clientSecret(installation.clientSecret)
    .resteasyClient(createClient())
    .build()

  private val realm = keycloakClient.realm(installation.realm)

  def register(user: UserDetailsKeycloak, password: ValidPassword): Future[PunterId] = {
    Future {
      val keycloakUser = KeycloakUser()
        .enabled(true)
        .withDetails(user)
        .withPassword(password.value)
        .emailVerified(false)
        .accountVerified(false)
        .includedInGroup(Groups.Punters)

      val response = realm.users().create(keycloakUser.value)
      PunterId(UUID.fromString(CreatedResponseUtil.getCreatedId(response)).toString)
    }
  }

  def findSessions(punterId: PunterId): List[UserSessionRepresentation] = {
    realm.users().get(punterId.value).getUserSessions.asScala.toList
  }
}
