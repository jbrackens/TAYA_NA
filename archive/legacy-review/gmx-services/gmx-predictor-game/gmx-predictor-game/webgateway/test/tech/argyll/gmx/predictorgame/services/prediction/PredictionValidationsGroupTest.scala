package tech.argyll.gmx.predictorgame.services.prediction

import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.junit.JUnitRunner

@RunWith(classOf[JUnitRunner])
class PredictionValidationsGroupTest extends FunSuite {

  private val objectUnderTest = new PredictionValidations {}

  test("'validateSeq()' should fail when max points is more than 16") {
    // given
    val givenPredictions = Seq(
      SelectedPrediction("1", 17, Some("s1")), //<-
      SelectedPrediction("2", 16, Some("s2")),
      SelectedPrediction("3", 14, Some("s3")),
      SelectedPrediction("4", 13, Some("s4")),
      SelectedPrediction("5", 15, Some("s5"))
    )

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateSeq(givenPredictions)
    }

    // then
  }

  test("'validateSeq()' should fail when points duplicated") {
    // given
    val givenPredictions = Seq(
      SelectedPrediction("1", 12, Some("s1")),
      SelectedPrediction("2", 16, Some("s2")),
      SelectedPrediction("3", 14, Some("s3")),
      SelectedPrediction("4", 16, Some("s4")), //<-
      SelectedPrediction("5", 15, Some("s5"))
    )

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateSeq(givenPredictions)
    }

    // then
  }

  test("'validateSeq()' should fail when gap in points") {
    // given
    val givenPredictions = Seq(
      SelectedPrediction("1", 12, Some("s1")),
      SelectedPrediction("2", 16, Some("s2")),
      SelectedPrediction("3", 14, Some("s3")),
      // <-
      SelectedPrediction("5", 15, Some("s5"))
    )

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateSeq(givenPredictions)
    }

    // then
  }

  test("'validateSeq()' should pass when valid") {
    // given
    val givenPredictions = Seq(
      SelectedPrediction("1", 12, Some("s1")),
      SelectedPrediction("2", 16, Some("s2")),
      SelectedPrediction("3", 14, Some("s3")),
      SelectedPrediction("4", 13, Some("s4")),
      SelectedPrediction("5", 15, Some("s5"))
    )

    // when
    objectUnderTest.validateSeq(givenPredictions)

    // then
  }

}
