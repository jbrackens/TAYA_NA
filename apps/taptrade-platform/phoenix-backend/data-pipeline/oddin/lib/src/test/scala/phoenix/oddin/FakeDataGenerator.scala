package phoenix.oddin

import java.util.UUID

import scala.util.Random

import com.github.javafaker.Faker

import phoenix.core.Clock
import phoenix.dataapi.internal.oddin.MarketChangedEvent
import phoenix.dataapi.internal.oddin.SelectionOdds

object FakeDataGenerator {
  val clock: Clock = Clock.utcClock
  val faker = new Faker()

  val MatchStatusValues = List("0", "1", "2", "3", "4", "51", "52", "53", "54", "55", "56", "57")

  def randomMatchStatusValue(): String = {
    MatchStatusValues(faker.random().nextInt(MatchStatusValues.size))
  }

  def fakeMarketOddsChangeEvent(numberOfSelections: Int = 2): MarketChangedEvent = {
    val correlationId = UUID.randomUUID().toString
    val receivedAtUtc = clock.currentOffsetDateTime().toInstant.toEpochMilli
    val sportId = UUID.randomUUID().toString
    val fixtureId = UUID.randomUUID().toString
    val marketId = UUID.randomUUID().toString
    MarketChangedEvent(
      correlationId = correlationId,
      receivedAtUtc = receivedAtUtc,
      sportId = sportId,
      fixtureId = fixtureId,
      marketId = marketId,
      marketName = faker.funnyName().name(),
      marketStatus = "",
      marketType = "",
      marketCategory = None,
      marketPriority = 1,
      marketSpecifiers = Map("handicap" -> Random.shuffle(Seq("1.5", "2.5", "5.5", "8.5")).head),
      selectionOdds =
        (1 to numberOfSelections).map(_ => fakeSelectionOdds(correlationId, sportId, fixtureId, marketId)))
  }

  def fakeSelectionOdds(correlationId: String, sportId: String, fixtureId: String, marketId: String): SelectionOdds = {
    val selectionId = UUID.randomUUID().toString
    val selectionName = faker.funnyName().name()
    val odds =
      Some(BigDecimal(s"${faker.number().numberBetween(1, 999)}.${faker.number().numberBetween(1, 100)}").toString())
    SelectionOdds(correlationId, sportId, fixtureId, marketId, selectionId, selectionName, odds, active = true)
  }
}
