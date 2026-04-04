package tech.argyll.gmx.predictorgame.engine.racing

import org.junit.runner.RunWith
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.prop.TableDrivenPropertyChecks
import tech.argyll.gmx.predictorgame.domain.model.EventStatus._
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseStatus._

@RunWith(classOf[JUnitRunner])
class DomainMapperTest extends FlatSpec with TableDrivenPropertyChecks {

  private val objectUnderTest = new DomainMapper {}

  val raceStatusMapping =
    Table(
      ("givenInput", "expectedStatus"),

      ("Dormant", NEW),
      ("Delayed", NEW),
      ("Parading", NEW),
      ("GoingDown", NEW),
      ("AtThePost", NEW),
      ("GoingBehind", NEW),
      ("GoingInStalls", NEW),
      ("UnderOrders", NEW),

      ("Off", ONGOING),

      ("Finished", ONGOING),
      ("Result", ONGOING),
      ("WeighedIn", FINISHED),

      ("FalseStart", NEW),
      ("Photograph", ONGOING),
      ("RaceVoid", VOID),
      ("Abandoned", VOID),

      ("unknown", VOID),
      ("", VOID),
      (null, VOID)
    )

  val horseStatusMapping =
    Table(
      ("givenInput", "expectedIsRunner"),
      ("Runner", RUNNER),
      ("NonRunner", NON_RUNNER),
      ("Withdrawn", NON_RUNNER),
      ("Reserve", NON_RUNNER),
      ("Doubtful", NON_RUNNER),

      ("unknown", NON_RUNNER),
      ("", NON_RUNNER),
      (null, NON_RUNNER)
    )

  it should "map race.status string to EventStatus" in {
    forAll(raceStatusMapping) { (givenInput: String, expectedStatus: EventStatus) =>
      val actual = objectUnderTest.mapEventStatus(givenInput)
      actual should be(expectedStatus)
    }
  }

  it should "map horse.status string to isRunner" in {
    forAll(horseStatusMapping) { (givenInput: String, expectedIsRunner: HorseStatus) =>
      val actual = objectUnderTest.mapHorseStatus(givenInput)
      actual should be(expectedIsRunner)
    }
  }

}
