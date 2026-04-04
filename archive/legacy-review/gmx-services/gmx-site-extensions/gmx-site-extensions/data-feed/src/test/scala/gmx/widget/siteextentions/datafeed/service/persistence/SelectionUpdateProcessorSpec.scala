package gmx.widget.siteextentions.datafeed.service.persistence

import org.mockito.Mockito
import org.scalatest.prop.TableDrivenPropertyChecks._
import org.scalatest.prop.TableFor2
import tech.argyll.video.domain.MarketDao
import tech.argyll.video.domain.SelectionDao

import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.patching.SelectionModelPatcher
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleMarketUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerEventUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerSelectionUpdate

class SelectionUpdateProcessorSpec extends BaseSpec {
  val objectUnderTest: SelectionUpdateProcessor = new SelectionUpdateProcessor(
    Mockito.mock(classOf[MarketDao]),
    Mockito.mock(classOf[SelectionDao]),
    Mockito.mock(classOf[SelectionModelPatcher]))

  val selectionUpdates: TableFor2[SelectionUpdate, String] =
    Table(
      ("givenSelectionUpdate", "expectedId"),
      (selection("0ML52836842_1", 753706662), "R753706662"),
      (selection("0HC52836900P0_1", 753708266), "R753708266"),
      (selection("0QA83295002#974647389_13L40817Q11714Q20", 974647389), "Q974647389_40817"),
      (selection("0QA83294995#974647240_11L40817Q16Q20", 974647240), "Q974647240_40817"),
      (selection("0QA83482785#976753705_22L198205Q11053343Q2-1", 976753705), "Q976753705_198205"),
      (selection("0QA83482785#976753709_23L198205Q11053343Q287", 976753709), "Q976753709_198205"),
      (selection("0QA83481173#976736173_24L198363Q11075997Q2-1", 976736173), "Q976736173_198363"),
      (selection("0QA83478032#976694598_24L156746Q1582674Q2-1", 976694598), "Q976694598_156746"),
      (selection("0QA83481173#976736187_25L198363Q11074618Q292", 976736187), "Q976736187_198363"))

  "A SelectionUpdateProcessor" should {
    "extract oldId depending of given selectionId" in {

      forAll(selectionUpdates) { (givenSelectionUpdate: SelectionUpdate, expectedId: String) =>
        objectUnderTest.extractOldId(givenSelectionUpdate) should be(expectedId)
      }
    }
  }

  private def selection(selectionId: String, selectionIntId: Int): SelectionUpdate = {
    sampleSoccerSelectionUpdate(sampleMarketUpdate(sampleSoccerEventUpdate))
      .copy(selectionId = selectionId, selectionIntId = selectionIntId)
  }
}
