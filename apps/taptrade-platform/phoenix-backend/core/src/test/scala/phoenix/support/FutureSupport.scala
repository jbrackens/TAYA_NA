package phoenix.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import cats.data.EitherT
import cats.data.OptionT
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span

trait FutureSupport extends ScalaFutures {

  protected def awaitTimeout: Timeout = Timeout(Span(10, Seconds))
  protected def awaitInterval: Interval = Interval(Span(10, Millis))

  def await[T](f: Future[T]): T =
    whenReady(f, awaitTimeout, awaitInterval)(identity)

  def await[T](opt: OptionT[Future, T]): Option[T] =
    await(opt.value)

  def awaitSeq[T](f: Future[T]*)(implicit ec: ExecutionContext): Seq[T] =
    await(Future.sequence(f))

  // Purposefully not providing an `await` for EitherT.
  // When an EitherT-typed expression is awaited against in test code,
  // the result should always be explicitly checked whether it's Right or Left.
  // Otherwise, tests might falsely pass if an `await` in the Given section silently fails,
  // thus creating the unintended preconditions for the test.

  def awaitRight[E, T](e: EitherT[Future, E, T]): T =
    whenReady(e.value, awaitTimeout, awaitInterval) {
      case Left(error)   => throw new IllegalStateException(s"Expected Either.right, got Either.left [$error]")
      case Right(result) => result
    }

  def awaitLeft[E, T](e: EitherT[Future, E, T]): E =
    whenReady(e.value, awaitTimeout, awaitInterval) {
      case Left(error)   => error
      case Right(result) => throw new IllegalStateException(s"Expected Either.left, got Either.right [$result]")
    }

  def awaitSource[Out, Mat](source: Source[Out, Mat])(implicit mat: Materializer): Seq[Out] =
    await(source.runWith(Sink.seq))
}
