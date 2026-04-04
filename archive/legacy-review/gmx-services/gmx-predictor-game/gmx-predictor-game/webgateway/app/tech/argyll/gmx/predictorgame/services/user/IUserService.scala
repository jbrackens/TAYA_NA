package tech.argyll.gmx.predictorgame.services.user

import java.sql.Timestamp

import com.typesafe.scalalogging.LazyLogging
import javax.inject.{Inject, Singleton}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.Tables.{UserAccountMappingRow, UsersRow}
import tech.argyll.gmx.predictorgame.common.uuid.UUIDGenerator
import tech.argyll.gmx.predictorgame.domain.model.SportType.SportType
import tech.argyll.gmx.predictorgame.domain.repository.UserRepository
import tech.argyll.gmx.predictorgame.security.auth.UserDetails

import scala.concurrent.{ExecutionContext, Future}

trait IUserService {
  def getUser(user: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[UsersRow]

  def storeUser(user: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[UsersRow]
}

@Singleton
class UserService @Inject()(val dbConfigProvider: DatabaseConfigProvider,
                            userRepo: UserRepository)
                           (implicit ec: ExecutionContext)
  extends IUserService
    with HasDatabaseConfigProvider[JdbcProfile] with ExtensionMethodConversions with LazyLogging {

  implicit val dbc: DatabaseConfig[JdbcProfile] = dbConfig

  import profile.api._

  override def getUser(input: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[UsersRow] = {
    dbc.db.run(userRepo.getUser(input.uuid))
  }

  override def storeUser(input: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[UsersRow] = {
    val query = for {
      existingUser <- userRepo.findUser(input.uuid)
      userRow = existingUser.map(updateUser(input, _)) getOrElse createUser(input)
      user <- userRepo.insertOrUpdateUser(userRow)

      existingMapping <- userRepo.findMapping(input.uuid, input.partnerId)
      account <- existingMapping.map(skip) getOrElse saveMapping(input)
    } yield (user, account)

    dbc.db.run(query.transactionally)
      .map(p => {
        logger.debug("Created user {} with {} account", p._1, p._2)
        p._1
      })
  }

  private def createUser(source: UserDetails)(implicit currentTime: Timestamp): UsersRow = {
    UsersRow(UUIDGenerator.uuid(), source.uuid, None, None, source.name, currentTime)
  }

  private def updateUser(source: UserDetails, target: UsersRow): UsersRow = {
    target.copy(name = source.name)
  }

  private def skip(row: UserAccountMappingRow): DBIO[Any] = {
    DBIO.successful(row)
  }

  private def saveMapping(source: UserDetails)(implicit currentTime: Timestamp): DBIO[Any] = {
    userRepo.insertMapping(UserAccountMappingRow(source.uuid, source.externalId, source.partnerId))
  }
}