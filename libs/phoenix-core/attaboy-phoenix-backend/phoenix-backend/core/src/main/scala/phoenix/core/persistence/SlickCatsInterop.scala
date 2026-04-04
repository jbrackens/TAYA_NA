package phoenix.core.persistence

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.Monad
import cats.StackSafeMonad
import cats.arrow.FunctionK
import slick.jdbc.JdbcProfile

import phoenix.core.persistence.ExtendedPostgresProfile.api._

object SlickCatsInterop {
  implicit def dbioMonad(implicit ec: ExecutionContext): Monad[DBIO] =
    new Monad[DBIO] with StackSafeMonad[DBIO] {
      override def flatMap[A, B](fa: DBIO[A])(f: A => DBIO[B]): DBIO[B] = fa.flatMap(f)
      override def pure[A](x: A): DBIO[A] = DBIO.successful(x)
    }

  def runQuery[P <: JdbcProfile](db: P#Backend#Database): FunctionK[DBIO, Future] =
    new FunctionK[DBIO, Future] {
      override def apply[A](fa: DBIO[A]): Future[A] = db.run(fa)
    }
}
