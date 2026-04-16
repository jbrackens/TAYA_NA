package phoenix.core

import scala.annotation.nowarn
import scala.concurrent.Future

import cats.Applicative
import cats.Monad
import cats.data.EitherT

/**
 * A trick based off [[cats.NotNull]],
 * exploiting the Scala's requirement that if there's a matching implicit value in the scope,
 * there should be EXACTLY ONE - in case there's two or more matching implicit values, a compilation error is raised.
 *
 * To statically ensure that the given type A is NOT `Future`,
 * request an implicit instance of `NotFuture[A]`, e.g. `class AllTypesButFutureWelcome[A: NotFuture]`.
 * There will be:
 * <li> exactly one instance  of `NotFuture[A]` if `A != Future`,
 * <li> exactly TWO instances of `NotFuture[A]` if `A == Future`, leading to a compilation error.
 */
trait NotFuture[A]

object NotFuture {
  private def ambiguousException: Exception =
    new Exception(
      "An instance of NotFuture[Future[_]] was used. This should never happen. " +
      "Both ambiguous NotFuture[Future[_]] instances should always be in scope if one of them is, and the code should NOT compile.")

  // Two instances of NotFuture are available for Future, leading to a compile-time error (ambiguous implicit).
  implicit def `If you are seeing this, you are probably trying to pass a Future value to EitherT.safeRightT - maybe EitherT.liftF should be used instead?`[
      A]: NotFuture[Future[A]] = throw ambiguousException
  implicit def ambiguousNotFutureFuture2[A]: NotFuture[Future[A]] = throw ambiguousException

  // Since NotFuture is just a marker trait with no functionality, it's safe to reuse a single instance of it. This helps prevent unnecessary allocations.
  private lazy val singleton: NotFuture[Any] = new NotFuture[Any] {}
  // Only one instance of NotFuture is available for any non-Future type, leading to NO compile-time error.
  implicit def notFutureForA[A]: NotFuture[A] = singleton.asInstanceOf[NotFuture[A]]
}

object EitherTUtils {
  // Basically, the same implementation as EitherT.rightT/pure, but with an extra protection against wrapping a Future.
  implicit class EitherTCompanionOps(self: EitherT.type) {

    /**
     * Consider the following piece of code:
     *
     * {{{
     * for {
     *   foo <- someMethodReturningEitherT(...)
     *   _ <- EitherT.rightT(someMethodReturningFuture(...)) /// WHOOPS... it should be EitherT.liftF
     *   bar <- anotherMethodReturningEitherT(...)
     *   _ <- ...
     * } yield ...
     * }}}
     *
     * This looks innocuous at first glance, but in fact the `Future` returned from `someMethodReturningFuture`
     * will execute independently from the following `for` instructions &mdash;
     * in this example, `anotherMethodReturningEitherT` will NOT wait for `someMethodReturningFuture` to complete. <br/>
     * The likely intention of the developer was to use [[EitherT.liftF]] rather than [[EitherT.rightT]] or [[EitherT.pure]]. <br/>
     * Note that there's no compiler warning, even when `-Ywarn-discarded-value` is enabled.
     *
     * This can lead to very subtle, hard to spot race conditions that might be never captured by any test,
     * and e.g. only manifest itself under the specific conditions of production environment. <br/>
     * To prevent these bugs, we explicitly forbid calling either `rightT` or `pure` via ArchUnit spec,
     * and instead provide this `safeRightT` method, which thanks to [[NotFuture]] context bound
     * will never allow for mistakenly wrapping a `Future`,
     * but will instead raise an error and point the developer to `EitherT.liftF`.
     */
    def safeRightT[F[_], A]: SafeRightTPartiallyApplied[F, A] = new SafeRightTPartiallyApplied[F, A]

    def unit[F[_]: Applicative, L]: EitherT[F, L, Unit] = safeRightT[F, L](())

    class SafeRightTPartiallyApplied[F[_], A] {
      @nowarn("cat=unused") // for the evidence of NotFuture
      def apply[B: NotFuture](b: B)(implicit F: Applicative[F]): EitherT[F, A, B] = EitherT(F.pure(Right(b)))
    }
  }

  implicit class EitherTOps[F[+_], A, B](self: EitherT[F, A, B]) {
    def leftFlatTap[BB >: B, C](f: A => EitherT[F, C, BB])(implicit F: Monad[F]): EitherT[F, A, B] = {
      self.leftFlatMap(a => f(a).leftMap(_ => a).flatMap(_ => self))
    }
  }
}
