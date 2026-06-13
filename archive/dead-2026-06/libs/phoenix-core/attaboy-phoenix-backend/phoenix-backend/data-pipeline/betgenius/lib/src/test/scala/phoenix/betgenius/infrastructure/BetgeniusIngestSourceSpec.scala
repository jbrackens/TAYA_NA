package phoenix.betgenius.infrastructure

import akka.NotUsed
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.ClosedShape
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Sink
import akka.testkit.TestProbe
import io.scalaland.chimney.dsl._
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.betgenius.domain._
import phoenix.dataapi.shared.FixtureChange
import phoenix.dataapi.shared.FixtureResult
import phoenix.dataapi.shared.MarketChange
import phoenix.dataapi.shared.MatchStatusUpdate
import phoenix.support.FutureSupport

class BetgeniusIngestSourceSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with OptionValues {

  private implicit val as = system.classicSystem
  private val completedMessage = "completed"

  private val fixtureChangeProbe = TestProbe()
  private val fixtureResultProbe = TestProbe()
  private val matchStatusUpdateProbe = TestProbe()
  private val marketChangeProbe = TestProbe()

  "BetgeniusIngestSource" should {

    "partition fixture ingest messages correctly" in {
      // given
      val fixtureIngest = BetgeniusDataGenerator.randomFixtureIngest
      val (queue, graph) = testSource
      graph.run()
      // when
      queue.offer(fixtureIngest).futureValue
      queue.complete()
      queue.watchCompletion().futureValue
      // then
      fixtureChangeProbe.expectMsg(fixtureIngest.transformInto[FixtureChange])
      expectNoMoreMessages
    }

    "partition result set ingest messages correctly" in {
      // given
      val resultSetIngest = BetgeniusDataGenerator.randomResultSetIngest
      val (queue, graph) = testSource
      graph.run()
      // when
      queue.offer(resultSetIngest).futureValue
      queue.complete()
      queue.watchCompletion().futureValue
      // then
      fixtureResultProbe.expectMsgAllOf(resultSetIngest.transformInto[Seq[FixtureResult]]: _*)
      expectNoMoreMessages
    }

    "partition multiSport ingest messages correctly" in {
      //given
      val multiSportIngest = BetgeniusDataGenerator.randomMultiSportIngest
      val (queue, graph) = testSource
      graph.run()
      // when
      queue.offer(multiSportIngest).futureValue
      queue.complete()
      queue.watchCompletion().futureValue
      // then
      matchStatusUpdateProbe.expectMsg(multiSportIngest.transformInto[MatchStatusUpdate])
      expectNoMoreMessages
    }

    "partition market set ingest messages correctly" in {
      // given
      val marketSetIngest = BetgeniusDataGenerator.randomMarketSetIngest
      val (queue, graph) = testSource
      graph.run()
      // when
      queue.offer(marketSetIngest).futureValue
      queue.complete()
      queue.watchCompletion().futureValue
      // then
      marketChangeProbe.expectMsgAllOf(marketSetIngest.transformInto[Seq[MarketChange]]: _*)
      expectNoMoreMessages
    }
  }

  private def expectNoMoreMessages = {
    fixtureChangeProbe.expectMsg(completedMessage)
    fixtureResultProbe.expectMsg(completedMessage)
    matchStatusUpdateProbe.expectMsg(completedMessage)
    marketChangeProbe.expectMsg(completedMessage)
  }

  private def testSource = {
    val (queue, ingestSource) = BetgeniusIngestSource()
    val graph = RunnableGraph.fromGraph(GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
      import GraphDSL.Implicits._

      val source = builder.add(ingestSource)

      assert(source.outlets.size == 4, "Wrong tested number of outlets")

      // @formatter:off
      source.fixtureChangeOut     ~> Sink.actorRef(fixtureChangeProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      source.marketChangeOut      ~> Sink.actorRef(marketChangeProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      source.fixtureResultOut     ~> Sink.actorRef(fixtureResultProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      source.matchStatusUpdateOut ~> Sink.actorRef(matchStatusUpdateProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      // @formatter:on
      ClosedShape
    })
    (queue, graph)
  }
}
