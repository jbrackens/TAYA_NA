package phoenix.oddin.support

import scala.util.Random

import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.OddinMarketId
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeMarketSpecifiersOps
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeSportEventIdOps

object OddinFakeDataGenerator {

  def generateMarketSpecifiers(): MarketSpecifiers =
    MarketSpecifiers.fromStringUnsafe(s"threshold=${Random.nextInt(100)}|map=${Random.nextInt(100)}")

  def generateMarketDescriptionId(): MarketDescriptionId =
    MarketDescriptionId(Random.nextInt(100))

  def generateSportEventId(): OddinSportEventId =
    OddinSportEventId.fromStringUnsafe(value = s"od:match:${Random.nextInt(100)}")

  def generateOddinMarketId(): OddinMarketId =
    OddinMarketId(generateSportEventId(), generateMarketDescriptionId(), generateMarketSpecifiers())
}
