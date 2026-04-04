package gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter

import java.time.OffsetDateTime
import java.time.ZoneOffset

import tech.argyll.video.domain.model.MarketType
import tech.argyll.video.domain.model.PartnerType
import tech.argyll.video.domain.model.SelectionType
import tech.argyll.video.domain.model.SportType

import gmx.dataapi.internal.siteextensions.event.EventTypeEnum
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.MarketUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.test.shared.DataRecordReader

class DataRecordConverterSpec extends BaseSpec {

  "A DataRecordConverter" should {
    "convert special events, markets and selections" in {
      Given("ENHANCED_ODDS event with one market and 4 selections")
      val records = DataRecordReader.fromJson("/data/datarecord/specialEvent.json")

      When("convert is executed")
      val actual = records.map(DataRecordConverter.convert(_, PartnerType.SPORT_NATION))

      Then("all records are converted without exception")
      actual.size should be(6)
      actual(0).asInstanceOf[EventUpdate].sport should be(SportType.ENHANCED_ODDS)
      actual(0).asInstanceOf[EventUpdate].eventType should be(EventTypeEnum.Outright)

      actual(1).asInstanceOf[MarketUpdate].marketType should be(MarketType.OUTRIGHT_WINNER)

      actual(2).asInstanceOf[SelectionUpdate].selectionType should be(SelectionType.WINNER)
      actual(3).asInstanceOf[SelectionUpdate].selectionType should be(SelectionType.WINNER)
      actual(4).asInstanceOf[SelectionUpdate].selectionType should be(SelectionType.WINNER)
      actual(5).asInstanceOf[SelectionUpdate].selectionType should be(SelectionType.WINNER)
    }

    "convert derivative markets" in {
      Given("HORSE_RACING event with 7 markets")
      val records = DataRecordReader.fromJson("/data/datarecord/derivativeMarkets.json")

      When("convert is executed")
      val actual = records.map(DataRecordConverter.convert(_, PartnerType.SPORT_NATION))

      Then("all records are converted without exception")
      actual.size should be(8)
      actual(0).asInstanceOf[EventUpdate].sport should be(SportType.HORSE_RACING)
      actual(0).asInstanceOf[EventUpdate].eventType should be(EventTypeEnum.DayOfEventRace)

      actual(1).asInstanceOf[MarketUpdate].marketType should be(MarketType.PLACE_ONLY)
      actual(2).asInstanceOf[MarketUpdate].marketType should be(MarketType.RACE_CARD)
      actual(3).asInstanceOf[MarketUpdate].marketType should be(MarketType.BETTING_WITHOUT_TWO_FAV)
      actual(4).asInstanceOf[MarketUpdate].marketType should be(MarketType.MATCH_BETTING)
      actual(5).asInstanceOf[MarketUpdate].marketType should be(MarketType.BETTING_WITHOUT_FAV)
      actual(6).asInstanceOf[MarketUpdate].marketType should be(MarketType.MATCH_BETTING)
      actual(7).asInstanceOf[MarketUpdate].marketType should be(MarketType.MATCH_BETTING)
    }

    "skip soccer Outright market" in {
      Given("SOCCER event with Outright type")
      val records = DataRecordReader.fromJson("/data/datarecord/soccerOutright.json")

      records.foreach(item => {
        When("convert is executed")
        val caught =
          intercept[ConverterException] {
            DataRecordConverter.convert(item, PartnerType.SPORT_NATION)
          }

        Then("skip processing by throwing ConverterException")
        caught.getMessage should be("Not supported event: Outright for sport: SOCCER")
      })
    }

    "convert supported selections" in {
      Given("list of selections with supported types")
      val records = DataRecordReader.fromJson("/data/datarecord/validSelectionTypes.json")

      When("convert is executed")
      val actual = records.map(DataRecordConverter.convert(_, PartnerType.SPORT_NATION))

      Then("skip process only")
      actual.size should be(2)
      actual(0).asInstanceOf[SelectionUpdate].selectionType should be(SelectionType.DAY_OF_EVENT)
      actual(1).asInstanceOf[SelectionUpdate].selectionType should be(SelectionType.STARTING_PRICE)
    }

    "convert proper Ante-post selections" in {
      Given("list of selections with supported types")
      val records = DataRecordReader.fromJson("/data/datarecord/properAntePostEvent.json")

      When("convert is executed")
      val actual = records.map(DataRecordConverter.convert(_, PartnerType.SPORT_NATION))

      Then("record is converted without exception")
      actual.size should be(1)
    }

    "skip not supported selections" in {
      Given("list of selections with not supported typed")
      val records = DataRecordReader.fromJson("/data/datarecord/invalidSelectionTypes.json")

      records.foreach(item => {
        When("convert is executed")
        val caught =
          intercept[ConverterException] {
            DataRecordConverter.convert(item, PartnerType.SPORT_NATION)
          }

        Then("skip processing by throwing ConverterException")
        caught.getMessage should startWith("SelectionType not found for")
      })
    }

    "parse timestamps in seconds and milliseconds" in {
      Given("list of selections with supported types")
      val records = DataRecordReader.fromJson("/data/datarecord/differentTimestamps.json")

      When("convert is executed")
      val actual = records.map(DataRecordConverter.convert(_, PartnerType.SPORT_NATION))

      Then("skip process only")
      actual.size should be(2)
      actual(0).asInstanceOf[EventUpdate].header.originDate should be(
        OffsetDateTime.of(2021, 7, 25, 10, 25, 29, 0, ZoneOffset.UTC).toInstant)
      actual(0).asInstanceOf[EventUpdate].header.processingDate should be(
        OffsetDateTime.of(2021, 7, 25, 10, 25, 29, 705000000, ZoneOffset.UTC).toInstant)
      actual(0).asInstanceOf[EventUpdate].startTime should be(
        OffsetDateTime.of(2021, 8, 22, 13, 0, 0, 0, ZoneOffset.UTC).toInstant)

      actual(1).asInstanceOf[EventUpdate].header.originDate should be(
        OffsetDateTime.of(2021, 7, 26, 9, 29, 36, 0, ZoneOffset.UTC).toInstant)
      actual(1).asInstanceOf[EventUpdate].header.processingDate should be(
        OffsetDateTime.of(2021, 7, 26, 9, 29, 38, 3000000, ZoneOffset.UTC).toInstant)
      actual(1).asInstanceOf[EventUpdate].startTime should be(
        OffsetDateTime.of(2021, 8, 22, 13, 0, 0, 0, ZoneOffset.UTC).toInstant)
    }
  }
}
