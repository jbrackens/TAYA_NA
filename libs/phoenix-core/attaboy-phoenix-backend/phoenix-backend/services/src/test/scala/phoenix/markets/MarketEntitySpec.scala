package phoenix.markets

import java.time.OffsetDateTime

import scala.collection.immutable

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.actor.typed.ActorRef
import akka.persistence.testkit.scaladsl.EventSourcedBehaviorTestKit
import org.scalatest.BeforeAndAfterAll
import org.scalatest.BeforeAndAfterEach
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.domain.DataProvider
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketProtocol.Commands.MarketCommand
import phoenix.markets.MarketProtocol.Commands.UpdateMarket
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketProtocol.Events.MarketSettled
import phoenix.markets.MarketProtocol.Responses.MarketResponse
import phoenix.markets.MarketProtocol.Responses.Success
import phoenix.markets.MarketProtocol._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.support.DataGenerator._
import phoenix.support.TestUtils

class MarketEntitySpec
    extends ScalaTestWithActorTestKit(TestUtils.eventSourcedBehaviorTestKitConfig)
    with AnyWordSpecLike
    with BeforeAndAfterEach
    with BeforeAndAfterAll {

  val timestamp = OffsetDateTime.parse("2020-02-02T20:02:20.020Z")
  val marketId = MarketId(DataProvider.Oddin, "Oddin|1000")

  val bettable: Bettable = Bettable(DataSupplierStatusChange)

  override protected def afterAll(): Unit = {
    super.afterAll()
    TestUtils.testCleanUp(system)
  }

  "A MarketEntity" ignore { // TODO (PHXD-1422): De-ignore this and rethink event testing
    val market =
      EventSourcedBehaviorTestKit[MarketCommand, MarketEvent, MarketState](
        system,
        MarketEntity(marketId, TestUtils.marketTags))

    val fixtureId = generateFixtureId()
    val marketName = generateMarketName()
    val marketType = randomMarketType()
    val specifiers = Seq.empty
    val marketInfo =
      MarketInfo(
        name = marketName,
        fixtureId = fixtureId,
        marketType = marketType,
        category = None,
        specifiers = Seq.empty)

    val id1 = generateSelectionId()
    val name1 = generateSelectionName()

    val id2 = generateSelectionId()
    val name2 = generateSelectionName()
    val correlationId = generateIdentifier()

    def generateSelectionOddsChanges(): immutable.Seq[SelectionOdds] = {
      val odds1 = Some(generateOdds())
      val odds2 = Some(generateOdds())

      Seq(SelectionOdds(id1, name1, odds1, active = true), SelectionOdds(id2, name2, odds2, active = true))
    }

    def generateUpdateMarketCommand(
        selectionOdds: Seq[SelectionOdds],
        replyTo: ActorRef[MarketResponse]): UpdateMarket =
      UpdateMarket(
        correlationId,
        timestamp,
        fixtureId,
        marketId,
        marketName,
        marketType,
        None,
        MarketLifecycle.Bettable(DataSupplierStatusChange),
        specifiers,
        selectionOdds,
        replyTo)

    "initially created" should {
      "should become bettable and emit expected events" in {
        // given
        val selectionOdds = generateSelectionOddsChanges()

        // when
        val result = market.runCommand[MarketResponse](
          replyTo =>
            Commands.UpdateMarket(
              correlationId,
              timestamp,
              fixtureId,
              marketId,
              marketName,
              marketType,
              None,
              bettable,
              specifiers,
              selectionOdds,
              replyTo))

        result.reply shouldBe Success.MarketUpdatedResponse(marketId)

        // then
        val marketCreated = Events.MarketCreated(marketId, bettable, marketInfo, selectionOdds, timestamp)
        val marketInfoChanged = Events.MarketInfoChanged(marketId, marketInfo, timestamp)
        val marketOddsChanged = Events.MarketOddsChanged(marketId, selectionOdds, timestamp)
        val marketBettable = Events.MarketBecameBettable(marketId, bettable.changeReason, timestamp)

        (result.events should contain)
          .theSameElementsInOrderAs(List(marketCreated, marketInfoChanged, marketOddsChanged, marketBettable))
        result.state shouldBe InitializedMarket(marketId, marketInfo, bettable, selectionOdds)
      }
    }

    "antepost" should {
      def becomeBettable(): InitializedMarket = {
        val selectionOdds = generateSelectionOddsChanges()

        val result =
          market.runCommand[MarketResponse](replyTo => generateUpdateMarketCommand(selectionOdds, replyTo))

        result.stateOfType[InitializedMarket]
      }

      "updated with latest odds" in {
        // given
        becomeBettable()

        // when
        val newOdds = generateSelectionOddsChanges()

        val result = market.runCommand[MarketResponse](
          replyTo =>
            Commands.UpdateMarket(
              correlationId,
              timestamp,
              fixtureId,
              marketId,
              marketName,
              marketType,
              None,
              bettable,
              specifiers,
              newOdds,
              replyTo))

        // then
        result.reply shouldBe Success.MarketUpdatedResponse(marketId)
        result.event shouldBe Events.MarketOddsChanged(marketId, newOdds, timestamp)
        result.stateOfType[InitializedMarket].marketSelections shouldBe MarketSelections(newOdds)
      }

      "not generate events if update changes nothing" in {
        // given
        val existingState = becomeBettable()

        // when
        val result = market.runCommand[MarketResponse](
          replyTo =>
            Commands.UpdateMarket(
              correlationId,
              timestamp,
              fixtureId,
              marketId,
              existingState.info.name,
              existingState.info.marketType,
              None,
              existingState.lifecycle,
              specifiers,
              existingState.marketSelections.toSeq,
              replyTo))

        // then
        result.events shouldBe empty
      }

      "allow settling by doing market update" in {
        // given
        val existingState = becomeBettable()

        // when
        val winningSelection = existingState.marketSelections.toSeq.head
        val lifecycleChangeReason = DataSupplierStatusChange
        val result = market.runCommand[MarketResponse](
          replyTo =>
            Commands.UpdateMarket(
              correlationId,
              timestamp,
              fixtureId,
              marketId,
              existingState.info.name,
              existingState.info.marketType,
              None,
              Settled(lifecycleChangeReason, winningSelection.selectionId),
              specifiers,
              existingState.marketSelections.toSeq,
              replyTo))

        // then
        result.events shouldBe Seq(
          MarketSettled(marketId, winningSelection.selectionId, lifecycleChangeReason, timestamp))
      }

      "allow settling by accepting dedicated command" in {
        // given
        val existingState = becomeBettable()

        // when
        val winningSelection = existingState.marketSelections.toSeq.head
        val lifecycleChangeReason = BackofficeChange("Requested by backoffice")
        val result = market.runCommand[MarketResponse](replyTo =>
          Commands.SettleMarket(marketId, winningSelection.selectionId, lifecycleChangeReason, timestamp, replyTo))

        // then
        result.events shouldBe Seq(
          MarketSettled(marketId, winningSelection.selectionId, lifecycleChangeReason, timestamp))
      }
    }
  }
}
