package phoenix.betgenius.infrastructure
import akka.NotUsed
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.SinkShape
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.testkit.TestProbe
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.betgenius.domain._

class BetgeniusIngestPartitionerSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers {

  private implicit val as = system.classicSystem
  private val completedMessage = "completed"

  private val coverageIngestProbe = TestProbe()
  private val fixtureIngestProbe = TestProbe()
  private val marketSetIngestProbe = TestProbe()
  private val resultSetIngestProbe = TestProbe()
  private val multiSportIngestProbe = TestProbe()

  "BetgeniusIngestPartitioner" should {
    "partition coverage ingest messages correctly" in {
      // given
      val coverageIngest = BetgeniusDataGenerator.randomCoverageIngest
      // when
      Source.single(coverageIngest).to(testPartitioner).run()
      // then
      coverageIngestProbe.expectMsg(coverageIngest)
      expectNoMoreMessages
    }

    "partition fixture ingest messages correctly" in {
      // given
      val fixtureIngest = BetgeniusDataGenerator.randomFixtureIngest
      // when
      Source.single(fixtureIngest).to(testPartitioner).run()
      // then
      fixtureIngestProbe.expectMsg(fixtureIngest)
      expectNoMoreMessages
    }

    "partition market set ingest messages correctly" in {
      // given
      val marketSetIngest = BetgeniusDataGenerator.randomMarketSetIngest
      // when
      Source.single(marketSetIngest).to(testPartitioner).run()
      // then
      marketSetIngestProbe.expectMsg(marketSetIngest)
      expectNoMoreMessages
    }

    "partition result set ingest messages correctly" in {
      // given
      val resultSetIngest = BetgeniusDataGenerator.randomResultSetIngest
      // when
      Source.single(resultSetIngest).to(testPartitioner).run()
      // then
      resultSetIngestProbe.expectMsg(resultSetIngest)
      expectNoMoreMessages
    }

    "partition multi sport ingest messages correctly" in {
      // given
      val multiSportIngest = BetgeniusDataGenerator.randomMultiSportIngest
      // when
      Source.single(multiSportIngest).to(testPartitioner).run()
      // then
      multiSportIngestProbe.expectMsg(multiSportIngest)
      expectNoMoreMessages
    }
  }

  private def expectNoMoreMessages = {
    coverageIngestProbe.expectMsg(completedMessage)
    fixtureIngestProbe.expectMsg(completedMessage)
    marketSetIngestProbe.expectMsg(completedMessage)
    resultSetIngestProbe.expectMsg(completedMessage)
    multiSportIngestProbe.expectMsg(completedMessage)
  }

  private def testPartitioner = {
    GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
      import GraphDSL.Implicits._

      val partitioner = builder.add(BetgeniusMessagePartitioner())

      // @formatter:off
      partitioner.coverageIngestOut   ~> Sink.actorRef(coverageIngestProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      partitioner.fixtureIngestOut    ~> Sink.actorRef(fixtureIngestProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      partitioner.marketSetIngestOut  ~> Sink.actorRef(marketSetIngestProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      partitioner.resultSetIngestOut  ~> Sink.actorRef(resultSetIngestProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      partitioner.multiSportIngestOut ~> Sink.actorRef(multiSportIngestProbe.ref, onCompleteMessage = completedMessage, onFailureMessage = _.getMessage)
      // @formatter:on
      SinkShape(partitioner.ingestIn)
    }

  }
}
