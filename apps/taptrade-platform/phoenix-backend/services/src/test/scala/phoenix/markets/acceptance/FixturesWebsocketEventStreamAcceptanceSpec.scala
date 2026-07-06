package phoenix.markets.acceptance

import akka.stream.scaladsl.Sink
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.time.FakeHardcodedClock

class FixturesWebsocketEventStreamAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with GivenWhenThen {

  val clock = new FakeHardcodedClock()
  val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)

  "Fixtures" should {

    "emit an update when Fixture is updated" in {

      Given("a Fixture")
      val fixture = env.marketScenarios.randomFixture()

      When("the Fixture receives updates")
      val fixtureEventStream =
        await(env.fixtureEventStreams.streamStateUpdates(fixture.fixtureId))
      val fixtureWithChanges =
        fixture.copy(
          startTime = clock.currentOffsetDateTime(),
          fixtureStatus = FixtureLifecycleStatus.PostGame,
          currentScore = Some(FixtureScore(21, 37)))
      await(env.marketsBC.createOrUpdateFixture(fixtureWithChanges))

      Then("the changes should be received on the socket")
      // If this test is being flaky the first place to look is how this
      // stream is being hooked up AFTER the event is dispatched.
      // Could the event be being consumed before this flow is attached to the broadcast hub?
      val events = await(fixtureEventStream.take(1).runWith(Sink.seq))
      val expectedEvent = FixtureStateUpdate(
        fixtureWithChanges.fixtureId,
        fixtureWithChanges.fixtureName,
        fixtureWithChanges.startTime,
        fixtureWithChanges.fixtureStatus,
        fixtureWithChanges.currentScore.get)

      events should contain(expectedEvent)
    }
  }
}
