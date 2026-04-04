package gmx.widget.siteextentions.datafeed.test.shared

import java.time.Instant
import java.util.UUID
import java.util.concurrent.TimeUnit

import scala.util.Random

import com.github.javafaker.Faker
import tech.argyll.video.domain.model.PartnerType

import gmx.common.internal.partner.sbtech.cons.SBTechMarketType
import gmx.common.internal.partner.sbtech.cons.SBTechSelectionType
import gmx.common.internal.partner.sbtech.cons.SBTechSportType
import gmx.dataapi.internal.siteextensions.event.EventStatusEnum
import gmx.dataapi.internal.siteextensions.event.EventTypeEnum
import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter.EventStatusEnumMapping
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter.EventTypeEnumMapping

object DataGenerator {

  val faker = new Faker()
  object Helper {
    def randomUUID: UUID = UUID.randomUUID()
    def randomNumber: Int = Random.nextInt()
    def randomPriceNumerator: Int = Random.nextInt(5)
    def randomPriceDenominator: Int = Random.nextInt(20)
  }

  def generateUUID: String = Helper.randomUUID.toString

  def generatePastInstant: Instant =
    faker.date().past(10, TimeUnit.HOURS).toInstant

  def generateFutureInstant: Instant =
    faker.date().future(10, TimeUnit.HOURS).toInstant

  def generatePartnerType: PartnerType =
    Random.shuffle(PartnerType.values().toSeq).head

  def generateSBTechSportType: SBTechSportType =
    Random.shuffle(SBTechSportType.values).head

  def generateId: String = Helper.randomNumber.toString

  def generateCountryCode: String = faker.address().countryCode()

  def generateLeague: String = faker.esports().league()

  def generateEventType: EventTypeEnum =
    Random.shuffle(EventTypeEnumMapping.supported).head._2

  def generateEventName: String = faker.hobbit().location()

  def generateEventStatus: EventStatusEnum =
    Random.shuffle(EventStatusEnumMapping.supported).head._2

  def generateBool: Boolean =
    faker.bool().bool()

  def generateTeam: String =
    faker.team().name()

  def generateMarketName: String =
    faker.hipster().word()

  def generateSBTechMarketType: SBTechMarketType =
    Random.shuffle(SBTechMarketType.values).head

  def generateSelectionName: String =
    faker.team().creature()

  def generateSBTechSelectionType: SBTechSelectionType =
    Random.shuffle(SBTechSelectionType.values).head

  def generateOdds: Map[SelectionOddsTypeEnum, String] = {
    val numerator = Helper.randomPriceNumerator + 1
    val denominator = Helper.randomPriceDenominator + 1

    Map(
      SelectionOddsTypeEnum.Fractional -> s"$numerator/$denominator",
      SelectionOddsTypeEnum.Decimal -> roundTwo(numerator.toDouble / denominator).toString)
  }

  private def roundTwo(in: Double): Double = {
    BigDecimal(in).setScale(2, BigDecimal.RoundingMode.HALF_DOWN).toDouble
  }

}
