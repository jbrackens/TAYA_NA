package phoenix.core

import cats.data.EitherT
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.EitherTUtils._

class EitherTUtilsSpec extends AnyWordSpecLike with Matchers {

  "leftFlatTap" should {
    "not do anything if original result is right" in {
      var sideEffect = false

      val result = EitherT.safeRightT[Option, String](1).leftFlatTap { _ =>
        EitherT.safeRightT[Option, String] {
          sideEffect = true
          2
        }
      }
      result.value mustBe (Some(Right(1)))
      sideEffect mustBe false
    }

    "run side effect if left" in {
      var sideEffect = false

      val result = EitherT.leftT[Option, Int]("error").leftFlatTap { _ =>
        EitherT.safeRightT[Option, String] {
          sideEffect = true
          2
        }
      }
      result.value mustBe (Some(Left("error")))
      sideEffect mustBe true
    }

    "run side effect if left and return original error" in {
      var sideEffect = false

      val result = EitherT.leftT[Option, Int]("error").leftFlatTap { _ =>
        EitherT.leftT[Option, Int] {
          sideEffect = true
          "another error"
        }
      }
      result.value mustBe (Some(Left("error")))
      sideEffect mustBe true
    }
  }
}
