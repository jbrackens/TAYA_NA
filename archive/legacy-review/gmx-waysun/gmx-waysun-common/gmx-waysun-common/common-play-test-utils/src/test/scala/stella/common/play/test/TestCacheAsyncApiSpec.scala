package stella.common.play.test

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should.Matchers

import stella.common.core.AdjustableClock

class TestCacheAsyncApiSpec extends AsyncFlatSpec with Matchers {

  private val key1 = "key1"
  private val key2 = "key2"
  private val longTimeout = 100.seconds

  "getOrFuture" should "return cached value" in {
    val clock = new AdjustableClock
    val cache = new TestCacheAsyncApi(clock)
    for {
      val1 <- cache.getOrFuture(key1, longTimeout)(Future.successful(1))
      otherVal1 <- cache.getOrFuture(key2, longTimeout)(Future.successful("a"))
      val2 <- cache.getOrFuture(key1, longTimeout)(Future.successful(2))
      val3 <- cache.getOrFuture(key1, longTimeout)(Future.successful(3))
      otherVal2 <- cache.getOrFuture(key2, longTimeout)(Future.successful("b"))
    } yield {
      val1 shouldBe 1
      val2 shouldBe val1
      val3 shouldBe val1
      otherVal1 shouldBe "a"
      otherVal2 shouldBe otherVal1
    }
  }

  it should "not call the setter logic when the cached value didn't time out" in {
    val clock = new AdjustableClock
    val cache = new TestCacheAsyncApi(clock)
    for {
      _ <- cache.getOrFuture(key1, longTimeout)(Future.successful(1))
      _ <- cache.getOrFuture(key2, longTimeout)(Future.successful("a"))
      // explicit type annotations to don't let the compiler complain about dead code
      _ <- cache.getOrFuture(key1, longTimeout)(
        Future.failed(new Exception(s"This setter for $key1 should not be used")): Future[Int])
      _ <- cache.getOrFuture(key2, longTimeout)(
        Future.failed(new Exception(s"This setter for $key2 should not be used")): Future[String])
    } yield 1 shouldBe 1
  }

  it should "call the setter logic when the cached value timed out" in {
    val clock = new AdjustableClock
    val cache = new TestCacheAsyncApi(clock)
    val negativeTimeout = 0.seconds
    for {
      val1 <- cache.getOrFuture(key1, negativeTimeout)(Future.successful(1))
      otherVal1 <- cache.getOrFuture(key2, negativeTimeout)(Future.successful("a"))
      _ <- Future.successful(clock.moveTime())
      val2 <- cache.getOrFuture(key1, negativeTimeout)(Future.successful(2))
      _ <- Future.successful(clock.moveTime())
      val3 <- cache.getOrFuture(key1, negativeTimeout)(Future.successful(3))
      otherVal2 <- cache.getOrFuture(key2, negativeTimeout)(Future.successful("b"))
    } yield {
      val1 shouldBe 1
      val2 shouldBe 2
      val3 shouldBe 3
      otherVal1 shouldBe "a"
      otherVal2 shouldBe "b"
    }
  }
}
