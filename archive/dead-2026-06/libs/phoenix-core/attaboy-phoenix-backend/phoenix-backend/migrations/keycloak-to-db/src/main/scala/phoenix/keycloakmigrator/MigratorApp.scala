package phoenix.keycloakmigrator

import java.util.concurrent.Executors

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import akka.actor.ActorSystem
import cats.data.EitherT
import cats.syntax.applicativeError._
import cats.syntax.traverse._
import com.google.common.util.concurrent.ThreadFactoryBuilder
import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.core.persistence.ExtendedPostgresProfile.dateTimePlainImplicits._
import phoenix.http.core.AkkaHttpClient
import phoenix.keycloak.KeycloakConfig
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.RegisteredUserKeycloakWithLegacyFields
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository

object MigratorApp extends App {

  implicit val ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global
  private val log = LoggerFactory.getLogger(getClass)

  val migrator = new MigrationKcDb(
    KeycloakDbMigrationConfiguration.authenticationRepository,
    KeycloakDbMigrationConfiguration.dbConfig)
  log.info(s"Migrating some keycloak data to db")
  Await.result(migrator.migrateFields(), 5.minute)

  Await.result(KeycloakDbMigrationConfiguration.system.terminate(), 15.seconds)
  log.info("Migration finished")
}

object KeycloakDbMigrationConfiguration {

  implicit val system: ActorSystem = ActorSystem()
  import akka.actor.typed.scaladsl.adapter.ClassicActorSystemOps

  val systemTyped = system.toTyped

  private val config: Config = ConfigFactory.load()
  val keycloakConfig = KeycloakConfig.of(config)
  val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick", config)
  val httpClient = new AkkaHttpClient(system)

  val blockingThreadFactory =
    new ThreadFactoryBuilder().setDaemon(false).setPriority(Thread.NORM_PRIORITY).setNameFormat("blocking-ec-").build()
  val blockingExecutionContext: ExecutionContext =
    ExecutionContext.fromExecutorService(Executors.newCachedThreadPool(blockingThreadFactory))

  val authenticationRepository: AuthenticationRepository = {
    new KeycloakAuthenticationRepository(keycloakConfig, httpClient)(systemTyped, blockingExecutionContext)
  }
}

class MigrationKcDb(authenticationRepository: AuthenticationRepository, dbConfig: DatabaseConfig[JdbcProfile])(implicit
    ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)
  case class MigrationError(message: String)
  val migrations: Seq[MigrationSet] = Seq(Migration1, Migration2, Migration3, Migration4, Migration5)

  def migrateFields(): Future[Int] = {
    log.info(s"Migrating fields from keycloak to db")

    migrations.traverse(_.runMigration()).map(_.sum)
  }

  trait MigrationSet {
    val migrationSet: Int
    lazy val logPrefix = s"Migration set [$migrationSet]"
    def getPuntersToMigrate()(implicit ec: ExecutionContext): Future[Vector[PunterId]]
    def tryToMigrate(punterId: PunterId): Future[Int]

    def runMigration(): Future[Int] = {
      val punters = getPuntersToMigrate()
      val out: Future[Int] = punters.flatMap { puntersList =>
        log.info(s"$logPrefix There are ${puntersList.size} punters to migrate...")
        puntersList
          .traverse { punterId =>
            tryToMigrate(punterId)
          }
          .map(_.sum)
      }
      out.foreach { migrated =>
        log.info(s"$logPrefix Migrated $migrated punters")
      }
      out
    }

  }

  object Migration1 extends MigrationSet {
    override val migrationSet: Int = 1

    def getPuntersToMigrate()(implicit ec: ExecutionContext): Future[Vector[PunterId]] = {
      dbConfig.db
        .run(sql"""
      SELECT pd.punter_id
      FROM punter_personal_details pd
      WHERE pd.punter_id NOT IN (
        SELECT punter_id FROM punter_settings
        WHERE migrated_keycloak_db_set1=true)""".as[String])
        .map(_.map(id => PunterId(id)))
    }

    def tryToMigrate(punterId: PunterId): Future[Int] = {
      val oneRecordMigrated = 1
      log.info(s"$logPrefix Attempt to migrate punterId=$punterId")
      val migration = for {
        punterFromKeycloak <- readPunterFromAuth(punterId)
        _ <-
          updateDb(punterId, punterFromKeycloak.isPhoneNumberVerified.getOrElse(false), punterFromKeycloak.lastSignIn)
      } yield ()
      migration.fold(
        { err =>
          log.error(s"$logPrefix punterId=$punterId migration failed: $err")
          0
        },
        { _ =>
          log.info(s"$logPrefix $punterId - settings and details migrated")
          oneRecordMigrated
        })
    }

    private def updateDb(punterId: PunterId, isPhoneNumberVerified: Boolean, lastSignIn: Option[LastSignInData]) = {
      val sqlAction = sqlu"""
      BEGIN;

      UPDATE punter_personal_details
        SET is_phone_number_verified=$isPhoneNumberVerified
        WHERE punter_id=${punterId.value};

      INSERT INTO punter_settings (punter_id, last_sign_in_timestamp, last_sign_in_ip, migrated_keycloak_db_set1)
      VALUES (${punterId.value},
        ${lastSignIn.map(_.timestamp.value.toString)}::timestamptz,
        ${lastSignIn.map(_.ipAddress.value)},
        true)
      ON CONFLICT (punter_id) DO UPDATE SET
        last_sign_in_timestamp=${lastSignIn.map(_.timestamp.value.toString)}::timestamptz,
        last_sign_in_ip=${lastSignIn.map(_.ipAddress.value)},
        migrated_keycloak_db_set1=true;

      COMMIT;
      """

      dbConfig.db.run(sqlAction).attemptT.leftMap { err =>
        val msg = s"$logPrefix $punterId error: ${err.getMessage}"
        log.error(msg, err)
        MigrationError(msg)
      }
    }
  }

  object Migration2 extends MigrationSet {
    override val migrationSet: Int = 2

    def getPuntersToMigrate()(implicit ec: ExecutionContext): Future[Vector[PunterId]] = {
      dbConfig.db
        .run(sql"""
      SELECT pd.punter_id
      FROM punter_personal_details pd
      WHERE pd.punter_id NOT IN (
        SELECT punter_id FROM punter_settings
        WHERE mfa_enabled IS NOT null)""".as[String])
        .map(_.map(id => PunterId(id)))
    }

    def tryToMigrate(punterId: PunterId): Future[Int] = {
      val oneRecordMigrated = 1
      log.info(s"$logPrefix Attempt to migrate punterId=$punterId")
      val migration = for {
        punterFromKeycloak <- readPunterFromAuth(punterId)
        _ <- updateDb(punterId, twoFactorAuthEnabled = punterFromKeycloak.twoFactorAuthEnabled.getOrElse(false))
      } yield ()
      migration.fold(
        { err =>
          log.error(s"$logPrefix punterId=$punterId migration failed: $err")
          0
        },
        { _ =>
          log.info(s"$logPrefix $punterId - settings and details migrated")
          oneRecordMigrated
        })
    }

    private def updateDb(punterId: PunterId, twoFactorAuthEnabled: Boolean) = {
      val sqlAction = sqlu"""
      BEGIN;

      UPDATE punter_settings
        SET
          mfa_enabled=$twoFactorAuthEnabled
        WHERE punter_id=${punterId.value};

      COMMIT;
      """

      dbConfig.db.run(sqlAction).attemptT.leftMap { err =>
        val msg = s"$logPrefix $punterId error: ${err.getMessage}"
        log.error(msg, err)
        MigrationError(msg)
      }
    }
  }

  trait SmartMigrationSet extends MigrationSet {
    val migrationVersion: Int

    override val migrationSet: Int = migrationVersion + 2

    override def getPuntersToMigrate()(implicit ec: ExecutionContext): Future[Vector[PunterId]] =
      dbConfig.db
        .run(sql"""
        SELECT punter_id FROM punter_settings
        WHERE keycloak_migration_version = $migrationVersion - 1""".as[String])
        .map(_.map(id => PunterId(id)))

    override def tryToMigrate(punterId: PunterId): Future[Int] = {
      log.info(s"$logPrefix Attempt to migrate punterId=$punterId")
      val migration = for {
        punterFromKeycloak <- readPunterFromAuth(punterId)
        _ <- updateDb(punterId, punterFromKeycloak)
      } yield ()
      migration.fold(
        { err =>
          log.error(s"$logPrefix $punterId - migration failed: $err")
          0
        },
        { _ =>
          log.info(s"$logPrefix $punterId - migration successful")
          1
        })
    }

    protected def updateDb(
        punterId: PunterId,
        punterFromKeycloak: RegisteredUserKeycloakWithLegacyFields): EitherT[Future, MigrationError, Int]
  }

  object Migration3 extends SmartMigrationSet {
    val migrationVersion: Int = 1

    protected def updateDb(
        punterId: PunterId,
        punterFromKeycloak: RegisteredUserKeycloakWithLegacyFields): EitherT[Future, MigrationError, Int] = {
      for {
        preferences <- EitherT.fromOption[Future](
          punterFromKeycloak.userPreferences,
          MigrationError("Empty user preferences in Keycloak"))
        sql = sqlu"""
            UPDATE punter_settings
            SET pref_announcements           = ${preferences.communicationPreferences.announcements},
                pref_auto_accept_better_odds = ${preferences.bettingPreferences.autoAcceptBetterOdds},
                pref_promotions              = ${preferences.communicationPreferences.promotions},
                pref_sign_in_notifications   = ${preferences.communicationPreferences.signInNotifications},
                pref_subscription_updates    = ${preferences.communicationPreferences.subscriptionUpdates},
                keycloak_migration_version   = ${migrationVersion}
            WHERE punter_id = ${punterId.value}
            """
        result <- dbConfig.db.run(sql).attemptT.leftMap(err => MigrationError(err.getMessage))
      } yield result
    }

  }

  object Migration4 extends SmartMigrationSet {
    val migrationVersion: Int = 2

    override protected def updateDb(
        punterId: PunterId,
        punterFromKeycloak: RegisteredUserKeycloakWithLegacyFields): EitherT[Future, MigrationError, Int] = {
      for {
        terms <-
          EitherT
            .fromOption[Future](punterFromKeycloak.termsAgreement, MigrationError("Empty terms agreement in Keycloak"))
        sql = sqlu"""
            UPDATE punter_settings
            SET terms_accepted_at            = ${terms.acceptedAt},
                terms_accepted_version       = ${terms.version.value},
                keycloak_migration_version   = ${migrationVersion}
            WHERE punter_id = ${punterId.value}
            """
        result <- dbConfig.db.run(sql).attemptT.leftMap(err => MigrationError(err.getMessage))
      } yield result
    }
  }

  object Migration5 extends SmartMigrationSet {
    val migrationVersion: Int = 3

    override protected def updateDb(
        punterId: PunterId,
        punterFromKeycloak: RegisteredUserKeycloakWithLegacyFields): EitherT[Future, MigrationError, Int] = {
      for {
        signUpDate <- EitherT.fromEither[Future](
          punterFromKeycloak.signUpDate.toRight(MigrationError("Empty sign up date in Keycloak")))
        isRegistrationVerified <- EitherT.fromEither[Future](
          punterFromKeycloak.isRegistrationVerified.toRight(MigrationError("Empty sign up date in Keycloak")))
        isAccountVerified <- EitherT.fromEither[Future](
          punterFromKeycloak.isAccountVerified.toRight(MigrationError("Empty sign up date in Keycloak")))
        sql = sqlu"""
            UPDATE punter_settings
            SET sign_up_date            = ${signUpDate},
                is_registration_verified       = ${isRegistrationVerified},
                is_account_verified       = ${isAccountVerified},
                keycloak_migration_version   = ${migrationVersion}
            WHERE punter_id = ${punterId.value}
            """
        result <- dbConfig.db.run(sql).attemptT.leftMap(err => MigrationError(err.getMessage))
      } yield result
    }
  }

  private def readPunterFromAuth(
      punterId: PunterId): EitherT[Future, MigrationError, RegisteredUserKeycloakWithLegacyFields] = {
    EitherT.fromOptionF(
      authenticationRepository.findUserWithLegacyFields(UserLookupId.byPunterId(punterId)),
      MigrationError(s"punter=$punterId does not exists in keycloak"))
  }

}
