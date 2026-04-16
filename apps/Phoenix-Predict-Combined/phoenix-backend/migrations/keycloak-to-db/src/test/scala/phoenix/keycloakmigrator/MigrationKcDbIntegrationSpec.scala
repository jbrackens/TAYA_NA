package phoenix.keycloakmigrator

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._
import scala.util.Random

import cats.syntax.traverse._
import org.keycloak.OAuth2Constants
import org.keycloak.admin.client.CreatedResponseUtil
import org.keycloak.admin.client.KeycloakBuilder
import org.keycloak.representations.idm.CredentialRepresentation
import org.keycloak.representations.idm.UserRepresentation
import org.keycloak.representations.idm.UserSessionRepresentation
import org.scalatest.GivenWhenThen
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.http.core.AkkaHttpClient
import phoenix.http.core.IpAddress
import phoenix.jwt.KeycloakInstallation
import phoenix.keycloak.KeycloakConfig
import phoenix.keycloak.KeycloakUtils.Groups
import phoenix.keycloak.KeycloakUtils.createClient
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.generatePunterWithSSN
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.UserDetailsKeycloak
import phoenix.punters.domain.UserId
import phoenix.punters.domain.UserPreferences
import phoenix.punters.domain.ValidPassword
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository
import phoenix.punters.infrastructure.KeycloakHelpers
import phoenix.punters.infrastructure.SlickPuntersRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomBoolean
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomSignInTimestamp
import phoenix.support.DataGenerator.randomTermsAgreement
import phoenix.support.DataGenerator.randomUserDetailsKeycloak
import phoenix.support.DataGenerator.randomUserPreferences
import phoenix.support.DataGenerator.randomValidPassword
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.testcontainers.Keycloak

final class MigrationKcDbIntegrationSpec
    extends AnyFlatSpec
    with Matchers
    with ActorSystemIntegrationSpec
    with FutureSupport
    with GivenWhenThen
    with DatabaseIntegrationSpec {

  private val keycloakConfig = Keycloak.instance.initNewRealm().config
  private val authenticationRepo: AuthenticationRepository =
    new KeycloakAuthenticationRepository(keycloakConfig, new AkkaHttpClient(system.classicSystem))(
      system,
      system.executionContext)
  private val kcClientWithLegacyWriteAccess = new KeycloakTestLegacyRepository(keycloakConfig)
  val puntersConfig = PuntersConfig.of(config)
  val puntersRepository: PuntersRepository =
    new SlickPuntersRepository(
      dbConfig,
      puntersConfig.ssnEncryptionPassword,
      KeycloakHelpers.additionalSsnLookup(authenticationRepo))

  case class KcData(
      punterId: PunterId,
      phoneNumberVerified: Boolean,
      lastSignInData: LastSignInData,
      userPreferences: UserPreferences,
      termsAgreement: TermsAgreement,
      signUpDate: OffsetDateTime,
      isEmailVerified: Boolean,
      isAccountVerified: Boolean,
      isRegistrationVerified: Boolean,
      mfaEnabled: Boolean)
  def addFullDataInKc(keycloakClient: KeycloakTestLegacyRepository): Future[List[KcData]] = {
    Range(0, 30).toList.traverse { it =>
      val userDetails = randomUserDetailsKeycloak()
      val password = randomValidPassword()
      val lastSignInData = LastSignInData(randomSignInTimestamp(), IpAddress(s"10.0.1.$it"))
      val isPhoneNumberVerified = randomBoolean()
      val userPreferences = randomUserPreferences()
      val terms = randomTermsAgreement()
      val twoFactorAuthEnabled = randomBoolean()
      val isRegistrationVerified = randomBoolean()
      val signUpDate = randomOffsetDateTime()
      val isEmailVerified = randomBoolean()
      val isAccountVerified = randomBoolean()
      keycloakClient
        .register(
          userDetails,
          password,
          lastSignInData,
          signUpDate,
          isPhoneNumberVerified,
          userPreferences,
          terms,
          twoFactorAuthEnabled,
          isAccountVerified,
          isRegistrationVerified)
        .map(pid =>
          KcData(
            pid,
            isPhoneNumberVerified,
            lastSignInData,
            userPreferences,
            terms,
            signUpDate,
            isEmailVerified,
            isAccountVerified,
            isRegistrationVerified,
            twoFactorAuthEnabled))
    }
  }

  def addPuntersDataInDb(punterIds: List[PunterId]): Future[Unit] = {
    punterIds
      .traverse { punterId =>
        PuntersRepoLegacyAccess.insertPunter(punterId, dbConfig)
      }
      .map(e => e.fold { () } { (_, _) => () })
  }

  it should "read full (legacy) data from keycloak" in {
    // given
    val userDetails = randomUserDetailsKeycloak()
    val password = randomValidPassword()

    // when
    val signInData = LastSignInData(randomSignInTimestamp(), IpAddress("8.7.6.5"))
    val isPhoneNumberVerified = randomBoolean()
    val preferences = randomUserPreferences()
    val terms = randomTermsAgreement()
    val isMFAEnabled = randomBoolean()
    val isRegistrationVerified = randomBoolean()
    val signUpDate = randomOffsetDateTime()
    val isAccountVerified = randomBoolean()
    val punterId =
      await(
        kcClientWithLegacyWriteAccess.register(
          userDetails,
          password,
          signInData,
          signUpDate,
          isPhoneNumberVerified,
          preferences,
          terms,
          isMFAEnabled,
          isAccountVerified,
          isRegistrationVerified))

    // then
    await(authenticationRepo.userExists(UserLookupId.byEmail(userDetails.email))) shouldBe true

    // and
    val userId = UserLookupId.byPunterId(punterId)
    val registeredUser = await(authenticationRepo.findUser(userId)).get
    registeredUser shouldBe RegisteredUserKeycloak(UserId(UUID.fromString(punterId.value)), userDetails, admin = false)
    userDetails.email.value should ===(registeredUser.details.email.value)
    // and
    val registeredUserWithLegacyFields = await(authenticationRepo.findUserWithLegacyFields(userId)).get
    registeredUserWithLegacyFields.lastSignIn shouldBe Some(signInData)
    registeredUserWithLegacyFields.isPhoneNumberVerified shouldBe Some(isPhoneNumberVerified)
    registeredUserWithLegacyFields.userPreferences shouldBe Some(preferences)
    registeredUserWithLegacyFields.twoFactorAuthEnabled shouldBe Some(isMFAEnabled)
    registeredUserWithLegacyFields.termsAgreement shouldBe Some(terms)
    registeredUserWithLegacyFields.isAccountVerified shouldBe Some(isAccountVerified)
    registeredUserWithLegacyFields.isRegistrationVerified shouldBe Some(isRegistrationVerified)
    registeredUserWithLegacyFields.signUpDate shouldBe Some(signUpDate)
    // and missing data in kc is optional
    registeredUserWithLegacyFields.last4DigitsOfSSN shouldBe None
  }

  it should "migrate all fields for users that exists in keycloak and db" in {
    Given("legacy punters in keycloak")
    val usersInKeycloak = await(addFullDataInKc(kcClientWithLegacyWriteAccess))
    await(addPuntersDataInDb(usersInKeycloak.map(_.punterId)))
    val migrator = new MigrationKcDb(authenticationRepo, dbConfig)
    val numberOfMigrations = migrator.migrations.size
    await(migrator.Migration1.getPuntersToMigrate()).size shouldBe usersInKeycloak.size

    When("migrating punters")
    val migratedCount = await(migrator.migrateFields())

    Then("all punters are migrated")
    migratedCount shouldBe usersInKeycloak.size * numberOfMigrations
    val puntersMigrated = await(usersInKeycloak.traverse { punter =>
      puntersRepository.findByPunterId(punter.punterId).value.map(_.toList)
    }).flatten

    And("migration 1 is successful")
    puntersMigrated.size shouldBe usersInKeycloak.size
    puntersMigrated.map(_.settings.lastSignIn) shouldBe usersInKeycloak.map(v => Some(v.lastSignInData))
    puntersMigrated.map(_.details.isPhoneNumberVerified) shouldBe usersInKeycloak.map(_.phoneNumberVerified)

    And("migration 2 is successful")
    puntersMigrated.map(_.settings.mfaEnabled) shouldBe usersInKeycloak.map(_.mfaEnabled)

    And("migration 3 is successful")
    puntersMigrated.map(_.settings.userPreferences) shouldBe usersInKeycloak.map(_.userPreferences)

    And("migration 4 is successful")
    puntersMigrated.map(_.settings.termsAgreement) shouldBe usersInKeycloak.map(_.termsAgreement)

    And("migration 5 is successful")
    puntersMigrated.map(_.settings.isRegistrationVerified) shouldBe usersInKeycloak.map(_.isRegistrationVerified)
    puntersMigrated.map(_.settings.isAccountVerified) shouldBe usersInKeycloak.map(_.isAccountVerified)
    puntersMigrated.map(_.settings.signUpDate) shouldBe usersInKeycloak.map(_.signUpDate)

    And("no new punters to migrate")
    migrator.migrations.foreach { migration =>
      await(migration.getPuntersToMigrate()).size shouldBe 0
    }

  }

  it should "support partial migrations" in {
    Given("legacy punters in keycloak")
    val usersInKeycloak = await(addFullDataInKc(kcClientWithLegacyWriteAccess))
    val punterIds = usersInKeycloak.map(_.punterId)
    await(addPuntersDataInDb(usersInKeycloak.map(_.punterId)))
    val migrator = new SubsetMigrationKcDb(authenticationRepo, dbConfig)
    await(migrator.Migration1.getPuntersToMigrate()).size shouldBe usersInKeycloak.size

    {
      When("performing migration 1")
      val migratedCount = await(migrator.migrateFirstNMigrations(1))

      Then("migration 1 is successful")
      migratedCount shouldBe usersInKeycloak.size
      await(migrator.Migration1.getPuntersToMigrate()).size shouldBe 0
      val puntersMigrated =
        await(punterIds.traverse(id => puntersRepository.findByPunterId(id).value.map(_.toList))).flatten

      puntersMigrated.size shouldBe usersInKeycloak.size
      puntersMigrated.map(_.settings.lastSignIn) shouldBe usersInKeycloak.map(v => Some(v.lastSignInData))
      puntersMigrated.map(_.details.isPhoneNumberVerified) shouldBe usersInKeycloak.map(_.phoneNumberVerified)
    }

    {
      When("performing migration 2")
      val migratedCount = await(migrator.migrateFirstNMigrations(2))

      Then("migration 2 is successful")
      migratedCount shouldBe usersInKeycloak.size
      await(migrator.Migration2.getPuntersToMigrate()).size shouldBe 0
      val puntersMigrated =
        await(punterIds.traverse(id => puntersRepository.findByPunterId(id).value.map(_.toList))).flatten
      puntersMigrated.map(_.settings.mfaEnabled) shouldBe usersInKeycloak.map(_.mfaEnabled)
    }

    {
      When("performing migration 3")
      val migratedCount = await(migrator.migrateFirstNMigrations(3))

      Then("migration 3 is successful")
      migratedCount shouldBe usersInKeycloak.size
      await(migrator.Migration3.getPuntersToMigrate()).size shouldBe 0
      val puntersMigrated =
        await(punterIds.traverse(id => puntersRepository.findByPunterId(id).value.map(_.toList))).flatten
      puntersMigrated.map(_.settings.userPreferences) shouldBe usersInKeycloak.map(_.userPreferences)
    }

    {
      When("performing migration 4")
      val migratedCount = await(migrator.migrateFirstNMigrations(4))

      Then("migration 4 is successful")
      migratedCount shouldBe usersInKeycloak.size
      await(migrator.Migration4.getPuntersToMigrate()).size shouldBe 0
      val puntersMigrated =
        await(punterIds.traverse(id => puntersRepository.findByPunterId(id).value.map(_.toList))).flatten
      puntersMigrated.map(_.settings.termsAgreement) shouldBe usersInKeycloak.map(_.termsAgreement)
    }

    {
      When("performing migration 5")
      val migratedCount = await(migrator.migrateFirstNMigrations(5))

      Then("migration 5 is successful")
      migratedCount shouldBe usersInKeycloak.size
      await(migrator.Migration5.getPuntersToMigrate()).size shouldBe 0
      val puntersMigrated =
        await(punterIds.traverse(id => puntersRepository.findByPunterId(id).value.map(_.toList))).flatten
      puntersMigrated.map(_.settings.isRegistrationVerified) shouldBe usersInKeycloak.map(_.isRegistrationVerified)
      puntersMigrated.map(_.settings.isAccountVerified) shouldBe usersInKeycloak.map(_.isAccountVerified)
      puntersMigrated.map(_.settings.signUpDate) shouldBe usersInKeycloak.map(_.signUpDate)
    }

    And("no new punters to migrate")
    migrator.migrations.foreach { migration =>
      await(migration.getPuntersToMigrate()).size shouldBe 0
    }
  }

  it should "migrate existing punters, do not stop when missing punters in auth repo" in {
    //given
    val usersInKeycloak = await(addFullDataInKc(kcClientWithLegacyWriteAccess))
    val nonExistingPunters = Range(1, 10).map(_ => generatePunterId())
    val puntersForCreationInDb = Random.shuffle(usersInKeycloak.map(_.punterId) ++ nonExistingPunters)
    await(addPuntersDataInDb(puntersForCreationInDb))
    val migrator = new MigrationKcDb(authenticationRepo, dbConfig)
    val numberOfMigrations = migrator.migrations.size

    //when
    val totalMigratedCount = await(migrator.migrateFields())

    //then
    totalMigratedCount shouldBe usersInKeycloak.size * numberOfMigrations
    val puntersMigratedInDb = await(usersInKeycloak.traverse { punter =>
      puntersRepository.findByPunterId(punter.punterId).value.map(_.toList)
    }).flatten
    puntersMigratedInDb.size shouldBe usersInKeycloak.size
    puntersMigratedInDb.map(_.settings.lastSignIn) shouldBe usersInKeycloak.map(v => Some(v.lastSignInData))
    puntersMigratedInDb.map(_.settings.mfaEnabled) shouldBe usersInKeycloak.map(_.mfaEnabled)
  }
}

private final class KeycloakTestLegacyRepository(config: KeycloakConfig)(implicit ec: ExecutionContext) {

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

  def register(
      user: UserDetailsKeycloak,
      password: ValidPassword,
      signInData: LastSignInData,
      signUpDate: OffsetDateTime,
      phoneNumberVerified: Boolean,
      userPreferences: UserPreferences,
      terms: TermsAgreement,
      twoFactorAuthEnabled: Boolean,
      accountVerified: Boolean,
      registrationVerified: Boolean): Future[PunterId] = {
    Future {
      val keycloakUser = KeycloakFullAccess
        .KeycloakUser()
        .enabled(true)
        .withDetails(user)
        .withLastSignInAt(signInData)
        .phoneNumberVerified(phoneNumberVerified)
        .withPreferences(userPreferences)
        .withTerms(terms)
        .withTwoFactorAuth(twoFactorAuthEnabled)
        .withPassword(password.value)
        .accountVerified(accountVerified)
        .registrationVerified(registrationVerified)
        .signUpDate(signUpDate)
        .includedInGroup(Groups.Punters)

      val response = realm.users().create(keycloakUser.value)
      PunterId(UUID.fromString(CreatedResponseUtil.getCreatedId(response)).toString)
    }
  }

  def findSessions(punterId: PunterId): List[UserSessionRepresentation] = {
    realm.users().get(punterId.value).getUserSessions.asScala.toList
  }
}

object KeycloakFullAccess {
  final case class KeycloakUser(value: UserRepresentation) {
    import KeycloakUser.passwordCredentials
    import phoenix.keycloak.{KeycloakPunterAttributes => Attributes}

    def withDetails(details: UserDetailsKeycloak): KeycloakUser = {
      value.setUsername(details.userName.value)
      value.setEmail(details.email.value.toLowerCase)
      value.setEmailVerified(details.isEmailVerified)
      this
    }

    def enabled(isEnabled: Boolean): KeycloakUser = {
      value.setEnabled(isEnabled)
      this
    }

    def accountVerified(isVerified: Boolean): KeycloakUser = {
      value.singleAttribute(Attributes.AccountVerified, isVerified.toString)
      this
    }

    def registrationVerified(isVerified: Boolean): KeycloakUser = {
      value.singleAttribute(Attributes.IsRegistrationVerified, isVerified.toString)
      this
    }

    def signUpDate(signUpDate: OffsetDateTime): KeycloakUser = {
      value.singleAttribute(Attributes.SignUpDate, signUpDate.toInstant.toEpochMilli.toString)
      this
    }

    def phoneNumberVerified(isVerified: Boolean): KeycloakUser = {
      value.singleAttribute(Attributes.IsPhoneNumberVerified, isVerified.toString)
      this
    }

    def withPassword(password: String): KeycloakUser = {
      value.setCredentials(List(passwordCredentials(password)).asJava)
      this
    }

    def withLastSignInAt(signInData: LastSignInData): KeycloakUser = {
      value.singleAttribute(Attributes.LastSignInTimestamp, signInData.timestamp.value.toInstant.toEpochMilli.toString)
      value.singleAttribute(Attributes.LastSignInIpAddress, signInData.ipAddress.value)
      this
    }

    def withTwoFactorAuth(twoFactorAuthEnabled: Boolean): KeycloakUser = {
      value.singleAttribute(Attributes.TwoFactorAuthEnabled, twoFactorAuthEnabled.toString)
      this
    }

    def includedInGroup(groupName: String): KeycloakUser = {
      value.setGroups(List(groupName).asJava)
      this
    }

    def withPreferences(preferences: UserPreferences): KeycloakUser = {
      value.singleAttribute(Attributes.Announcements, preferences.communicationPreferences.announcements.toString)
      value.singleAttribute(Attributes.Promotions, preferences.communicationPreferences.promotions.toString)
      value.singleAttribute(
        Attributes.SubscriptionUpdates,
        preferences.communicationPreferences.subscriptionUpdates.toString)
      value.singleAttribute(
        Attributes.SignInNotifications,
        preferences.communicationPreferences.signInNotifications.toString)
      value.singleAttribute(
        Attributes.AutoAcceptBetterOdds,
        preferences.bettingPreferences.autoAcceptBetterOdds.toString)
      this
    }

    def withTerms(terms: TermsAgreement): KeycloakUser = {
      value.singleAttribute(Attributes.TermsAcceptedVersionKey, terms.version.value.toString)
      value.singleAttribute(Attributes.TermsAcceptedAt, terms.acceptedAt.toInstant.toEpochMilli.toString)
      this
    }
  }

  object KeycloakUser {
    def apply(): KeycloakUser = KeycloakUser(new UserRepresentation())

    def passwordCredentials(password: String): CredentialRepresentation = {
      val credentials = new CredentialRepresentation()
      credentials.setTemporary(false)
      credentials.setType(CredentialRepresentation.PASSWORD)
      credentials.setValue(password)
      credentials
    }
  }
}

object PuntersRepoLegacyAccess {
  import slick.jdbc.PostgresProfile.api._

  private val log = LoggerFactory.getLogger(getClass)
  def insertPunter(punterId: PunterId, dbConfig: DatabaseConfig[JdbcProfile])(implicit
      ec: ExecutionContext): Future[Unit] = {

    val punter = generatePunterWithSSN(punterId = punterId)
    val dateFormattedISO = DateTimeFormatter.ISO_DATE
    log.info(s"Inserting punterId ${punterId}")
    for {
      _ <- dbConfig.db.run(sqlu"""INSERT INTO punter_registration_data VALUES (${punterId.value}, true, null, now())""")
      _ <- dbConfig.db.run(sqlu"""INSERT INTO punter_ssns (punter_id, last_4_ssn_digits) VALUES (
           ${punterId.value},
           ${punter.ssn.toLast4Digits.value}
            )""")

      _ <- dbConfig.db.run(sqlu"""INSERT INTO punter_personal_details VALUES (
           ${punterId.value},
           ${punter.details.userName.value},
           ${punter.details.name.title.value},
           ${punter.details.name.firstName.value},
           ${punter.details.name.lastName.value},

           ${punter.details.email.value},
           ${punter.details.phoneNumber.value},
           ${punter.details.address.addressLine.value},
           ${punter.details.address.city.value},
           ${punter.details.address.state.value},

           ${punter.details.address.zipcode.value},
           ${punter.details.address.country.value},
           ${punter.details.dateOfBirth.toOffsetDateTime.format(dateFormattedISO)}::date,
           ${punter.details.gender.map(_.toString)},
           ${punter.details.isTestAccount},

           ${punter.details.document.map(_.documentType.entryName)},
           ${punter.details.document.map(_.number.value)},
           ${punter.details.isPhoneNumberVerified}
            )""")
    } yield ()

  }
}
