package phoenix.core.persistence

import scala.concurrent.Future
import scala.util.Try

import slick.dbio.DBIO

object DBIOUtils {
  implicit final class DBIOOps(self: DBIO.type) {
    def fromTry[T](attempt: Try[T]): DBIO[T] = DBIO.from(Future.fromTry(attempt))
  }
}
