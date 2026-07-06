package phoenix.punters.infrastructure

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration
import scala.concurrent.duration._

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.core.Clock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.punters.domain.AccountVerificationCode
import phoenix.punters.domain.AccountVerificationCodeRepository

final class SlickAccountVerificationCodeRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)(implicit
    ec: ExecutionContext)
    extends AccountVerificationCodeRepository {

  import dbConfig.db

  private val table = TableQuery[VerificationCodesTable]

  override def create(userID: UUID, expiry: FiniteDuration = 15.minutes): Future[AccountVerificationCode] = {
    val token =
      AccountVerificationCode(UUID.randomUUID(), userID, clock.currentOffsetDateTime().plusSeconds(expiry.toSeconds))
    save(token).map(_ => token)
  }

  override def validate(id: UUID): Future[Option[AccountVerificationCode]] = findByIdNotExpired(id)

  override def cleanExpired(): Future[Seq[AccountVerificationCode]] =
    findExpired().flatMap { tokens =>
      Future.sequence(tokens.map { token =>
        delete(token.id).map(_ => token)
      })
    }

  private def findByIdNotExpired(id: UUID): Future[Option[AccountVerificationCode]] =
    db.run(table.filter(avc => avc.id === id && avc.expiry >= clock.currentOffsetDateTime()).result.headOption)

  private def findExpired(): Future[Seq[AccountVerificationCode]] =
    db.run(table.filter(_.expiry < clock.currentOffsetDateTime()).result)

  private def save(token: AccountVerificationCode): Future[Int] =
    db.run(table.insertOrUpdate(token))

  private def delete(id: UUID): Future[Int] =
    db.run(table.filter(_.id === id).delete)
}

private final class VerificationCodesTable(tag: Tag)
    extends Table[AccountVerificationCode](tag, _tableName = "verification_codes") {
  def id: Rep[UUID] = column[UUID]("id", O.PrimaryKey)
  def userId: Rep[UUID] = column[UUID]("user_id")
  def expiry: Rep[OffsetDateTime] = column[OffsetDateTime]("expiry")
  def * : ProvenShape[AccountVerificationCode] = (id, userId, expiry).mapTo[AccountVerificationCode]
}
