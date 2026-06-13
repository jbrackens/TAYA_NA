package stella.wallet.services.projections

import java.sql.Connection

import akka.japi.function
import akka.projection.jdbc.JdbcSession
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

/**
 * The JDBC implementation of Akka projection requires a `JdbcSession` to be implemented.
 * cf: https://doc.akka.io/docs/akka-projection/current/jdbc.html
 */
object StellaJdbcSession {
  def fromSlickDbConfig(dbConfig: DatabaseConfig[JdbcProfile]): JdbcSession =
    new DefaultSlickJdbcProfileSession(dbConfig)

  private final class DefaultSlickJdbcProfileSession(dbConfig: DatabaseConfig[JdbcProfile]) extends JdbcSession {
    lazy val connection: Connection = {
      val c = dbConfig.db.source.createConnection()
      c.setAutoCommit(false)
      c
    }

    override def withConnection[Result](func: function.Function[Connection, Result]): Result =
      func(connection)
    override def commit(): Unit = connection.commit()
    override def rollback(): Unit = connection.rollback()
    override def close(): Unit = connection.close()
  }
}
