package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import java.time.{LocalDateTime, ZoneId}

import net.flipsports.gmx.common.internal.partner.atr.cons.ATRContentType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto._
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterAll, FunSuite}
import play.api.libs.json.Json

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

@RunWith(classOf[JUnitRunner])
class ATRServiceTest extends FunSuite
  with MockitoSugar with BeforeAndAfterAll {

  private val sportMediastreamClientMock = mock[SportMediastreamClient]

  private val objectUnderTest = new ATRService(sportMediastreamClientMock)

  override def beforeAll(): Unit = {
    given(sportMediastreamClientMock.callFindEvents(any(), any()))
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("mock/atr_sms_findevents.json"))
      ))
    given(sportMediastreamClientMock.callGetStreamingURLs(any(), any(), any(), any()))
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("mock/atr_sms_getstreamingurls.json"))
      ))
  }


  test("'getAvailableEvents()' should parse mock JSON") {
    // given

    // when
    val eventualActual = objectUnderTest.getAvailableEvents(LocalDateTime.now(), LocalDateTime.now())
    var actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual should have size 172
    actual = ordered(actual)

    actual(0).id should be(394353)
    actual(0).contentType should be(ATRContentType.TEST_EVENTS)
    actual(0).eventNumber should be(1)
    actual(0).eventType should be(EventType.Live)
    actual(0).startTime should be(LocalDateTime.parse("2018-11-07T09:30:00").atZone(ZoneId.of("UTC")))
    actual(0).endTime should be(LocalDateTime.parse("2018-11-07T09:45:00").atZone(ZoneId.of("UTC")))
    actual(0).description should be("TestEvent20181107-1")
    actual(0).location should be("Test Venue")
    actual(0).locationCode should be("YZ")
    actual(0).country should be("GB")
    actual(0).liveEventStatus should be(LiveEventStatus.Finished)
    actual(0).vod should be(false)
    actual(0).geoRule.ruleType should be(GeoRuleType.Deny)
    actual(0).geoRule.countries should have size 0

    actual(28).id should be(395352)
    actual(28).contentType should be(ATRContentType.UNITED_STATES_HORSE)
    actual(28).eventNumber should be(10)
    actual(28).eventType should be(EventType.Live)
    actual(28).startTime should be(LocalDateTime.parse("2018-11-07T00:12:00").atZone(ZoneId.of("UTC")))
    actual(28).endTime should be(LocalDateTime.parse("2018-11-07T00:27:00").atZone(ZoneId.of("UTC")))
    actual(28).description should be("Race 10 - Claiming")
    actual(28).location should be("Portland Meadows")
    actual(28).locationCode should be("PW")
    actual(28).country should be("US")
    actual(28).liveEventStatus should be(LiveEventStatus.Finished)
    actual(28).vod should be(true)
    actual(28).geoRule.ruleType should be(GeoRuleType.Allow)
    actual(28).geoRule.countries should have size 5
    actual(28).geoRule.countries(0) should be("GB")
    actual(28).geoRule.countries(1) should be("GG")
    actual(28).geoRule.countries(2) should be("IE")
    actual(28).geoRule.countries(3) should be("IM")
    actual(28).geoRule.countries(4) should be("JE")

    actual(29).id should be(395791)
    actual(29).eventNumber should be(1)
    actual(29).eventType should be(EventType.Live)
    actual(29).startTime should be(LocalDateTime.parse("2018-11-07T23:45:00").atZone(ZoneId.of("UTC")))
    actual(29).endTime should be(LocalDateTime.parse("2018-11-08T00:00:00").atZone(ZoneId.of("UTC")))
    actual(29).description should be("Race 1 - Maiden Claiming")
    actual(29).location should be("Woodbine")
    actual(29).locationCode should be("WB")
    actual(29).country should be("US")
    actual(29).liveEventStatus should be(LiveEventStatus.NotYetAvailable)
    actual(29).vod should be(false)
    actual(29).geoRule.ruleType should be(GeoRuleType.Deny)
    actual(29).geoRule.countries should have size 2
    actual(29).geoRule.countries(0) should be("GB")
    actual(29).geoRule.countries(1) should be("PL")

  }

  private def ordered(actual: Seq[Event]) = {
    actual
      .sortBy(_.id)
      .map(b => b.copy(geoRule = b.geoRule.copy(countries = b.geoRule.countries.sorted)))
  }

  //  test("'loadTestEvents()' should parse mock JSON and filter by type") {
  //  28

  test("'getStreamingUrl()' should parse mock JSON") {
    // given

    // when
    val eventualActual = objectUnderTest.getStreamingUrl("123", "userID", "SN")
    val actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual.id should be(8276950)
    actual.bitrate should be (BitrateLevel.Adaptive)
    actual.format should be (MediaFormat.HLS)
    actual.url should be ("http://bw167.attheraces.com/hls/event/595752/1/0/livepkgr_e112/200129_USGU_1900_WgfKVH/280-450-825/pl.m3u8?pcode=c167&uh=9c341a2a913d749578260c620e16ec7a&base=c167-live-geo501-atr-hls.secure.footprint.net%2fhls-live&etime=20200129200800&grs=g111&key=IU64b4JAhxL%2bSmOTVV6%2fNKK3NfY")

  }

  test("'getStreamingUrl()' should pick Adaptive stream, fallback to highest bitrate") {
    // given
    given(sportMediastreamClientMock.callGetStreamingURLs(any(), any(), any(), any()))
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("external/atr/atr_sms_getstreamingurls_no_adaptive.json"))
      ))

    // when
    val eventualActual = objectUnderTest.getStreamingUrl("123", "userID", "SN")
    val actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual.bitrate should be (BitrateLevel.High)

  }

}
