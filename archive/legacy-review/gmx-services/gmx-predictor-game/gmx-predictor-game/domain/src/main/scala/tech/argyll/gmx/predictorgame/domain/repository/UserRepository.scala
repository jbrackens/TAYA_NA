package tech.argyll.gmx.predictorgame.domain.repository

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.{UserAccountMapping, UserAccountMappingRow, Users, UsersRow}
import tech.argyll.gmx.predictorgame.domain.NotFoundException

import scala.concurrent.ExecutionContext

class UserRepository(val config: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext) {

  import config.profile.api._

  def getUser(oidcSub: String): DBIO[UsersRow] = {
    findUser(oidcSub)
      .map(_.getOrElse(throw NotFoundException(s"Cannot find user for sub '$oidcSub'")))
  }

  def findUser(oidcSub: String): DBIO[Option[UsersRow]] = {
    Queries.userBySub(oidcSub).result.headOption
  }

  def findMapping(userId: String, partnerId:String): DBIO[Option[UserAccountMappingRow]] = {
    Queries.accountByUserPartner(userId, partnerId).result.headOption
  }

  def insertOrUpdateUser(row: UsersRow): DBIO[UsersRow] = {
    val result = for {
      _ <- Users.insertOrUpdate(row)
      result <- getUser(row.oidcSub)
    } yield result
    result.transactionally
  }

  def insertMapping(row: UserAccountMappingRow): DBIO[Int] = {
    val result = UserAccountMapping += row
    result.transactionally
  }

  object Queries {
    def userBySub(oidcSub: String) = {
      Users
        .filter(_.oidcSub === oidcSub)
    }

    def accountByUserPartner(oidcSub: String, partnerId:String) = {
      UserAccountMapping
        .filter(_.oidcSub === oidcSub)
        .filter(_.partnerId === partnerId)
    }
  }

}
