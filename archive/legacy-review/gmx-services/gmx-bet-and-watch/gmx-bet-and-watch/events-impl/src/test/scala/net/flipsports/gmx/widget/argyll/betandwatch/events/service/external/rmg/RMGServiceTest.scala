package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import net.flipsports.gmx.common.internal.partner.rmg.cons.RMGContentType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.dto.Event
import org.junit.runner.RunWith
import org.mockito.BDDMockito.`given`
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterAll, FunSuite}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}
import scala.xml.XML

@RunWith(classOf[JUnitRunner])
class RMGServiceTest extends FunSuite
  with MockitoSugar with BeforeAndAfterAll {

  private val dataFormatter = DateTimeFormatter.ofPattern("yyy-MM-dd HH:mm:ssxxx")

  private val contentScoreboardClientMock = mock[ContentScoreboardClient]

  private val objectUnderTest = new RMGService(contentScoreboardClientMock, contentScoreboardClientMock)

  override def beforeAll(): Unit = {
    given(contentScoreboardClientMock.callEventList())
      .willReturn(Future.successful(
        XML.load(getClass.getClassLoader.getResourceAsStream("external/rmg/rmg_csb_eventList.xml"))
      ))
  }

  test("'getAvailableEvents()' should parse mock XML") {
    // given

    // when
    val eventualActual = objectUnderTest.getAvailableEvents
    var actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual should have size 2
    actual = ordered(actual)

    actual(0).id should be(1812527)
    actual(0).contentType should be(RMGContentType.HORSE_RACING)
    actual(0).startTime should be(ZonedDateTime.parse("2020-08-24 12:00:00+00:00", dataFormatter))
    actual(0).endTime should be(ZonedDateTime.parse("2020-08-24 12:07:36+00:00", dataFormatter))
    actual(0).description should be("BALLINROBE 13:00 Adare Manor Opportunity Maiden Hurdle")
    actual(0).location should be("BALLINROBE")
    actual(0).chargeable should be(false)
    actual(0).blockedCountryCode.length should be(243)

    actual(1).id should be(1812529)
    actual(1).contentType should be(RMGContentType.HORSE_RACING)
    actual(1).startTime should be(ZonedDateTime.parse("2020-08-24 12:10:00+00:00", dataFormatter))
    actual(1).endTime should be(ZonedDateTime.parse("2020-08-24 12:13:16+00:00", dataFormatter))
    actual(1).description should be("AYR 13:10 Luxury Breaks At Western House Hotel Nursery")
    actual(1).location should be("AYR")
    actual(1).chargeable should be(false)
    actual(1).blockedCountryCode.length should be(243)
  }

  private def ordered(actual: Seq[Event]) = {
    actual
      .sortBy(_.startTime.toEpochSecond)
  }
}
