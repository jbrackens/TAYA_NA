package phoenix.oddin.infrastructure

import akka.actor.typed.ActorSystem
import akka.stream.ClosedShape
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Sink

import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.dataapi.internal.phoenix.MarketChangedEvent
import phoenix.dataapi.internal.phoenix.MarketSettlementEvent
import phoenix.oddin.domain.MarketDescriptionsRepository
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.domain.OddinStreamingApi
import phoenix.oddin.infrastructure.akkastreams.FixtureChangeFlow
import phoenix.oddin.infrastructure.akkastreams.MarketCancelFlow
import phoenix.oddin.infrastructure.akkastreams.MarketSettlementFlow
import phoenix.oddin.infrastructure.akkastreams.OddsChangeFlow
import phoenix.oddin.infrastructure.akkastreams.SportEventStatusFlows

final class OddinStreams(
    adapter: OddinMessageAdapter,
    oddinRestApi: OddinRestApi,
    marketDescriptionsRepository: MarketDescriptionsRepository)(implicit system: ActorSystem[_])
    extends OddinStreamingApi {

  override def buildRunnableGraph[M1, M2, M3, M4](
      oddsChangeEventBuilderParallelism: Int,
      fixtureChangeEventBuilderParallelism: Int,
      oddsChangeSink: Sink[MarketChangedEvent, M1],
      fixtureChangeSink: Sink[FixtureChangedEvent, M2],
      marketSettlementSink: Sink[MarketSettlementEvent, M3],
      marketCancelSink: Sink[MarketCancelEvent, M4]): RunnableGraph[(M1, M2, M3, M4)] =
    RunnableGraph.fromGraph(GraphDSL.createGraph(
      oddsChangeSink,
      fixtureChangeSink,
      marketSettlementSink,
      marketCancelSink)((a, b, c, d) => (a, b, c, d)) {
      implicit builder: GraphDSL.Builder[(M1, M2, M3, M4)] => (oddsSink, fixtureSink, settlementSink, cancelSink) =>
        import GraphDSL.Implicits._

        val crossFlow = builder.add(SportEventStatusFlows.buildShape())

        // @formatter:off
        val oddsChangeSource       = builder.add(adapter.oddsChanges)
        val oddsChangeFlow         = builder.add(OddsChangeFlow(marketDescriptionsRepository, oddsChangeEventBuilderParallelism))
        val fixtureChangeSource    = builder.add(adapter.fixtureChanges)
        val fixtureChangeFlow      = builder.add(FixtureChangeFlow(oddinRestApi, fixtureChangeEventBuilderParallelism))
        val marketSettlementSource = builder.add(adapter.marketSettlements)
        val marketSettlementFlow   = builder.add(MarketSettlementFlow())
        val marketCancelSource     = builder.add(adapter.marketCancellations)
        val marketCancelFlow       = builder.add(MarketCancelFlow())
        val tournamentChangeSource = builder.add(adapter.tournamentChanges)

        oddsChangeSource       ~> crossFlow.oddsChangeEventIn;    crossFlow.oddsChangeEventOut     ~> oddsChangeFlow       ~> oddsSink
        fixtureChangeSource    ~> crossFlow.fixtureChangeEventIn; crossFlow.fixtureChangeEventsOut ~> fixtureChangeFlow    ~> fixtureSink
        marketSettlementSource                                                                     ~> marketSettlementFlow ~> settlementSink
        marketCancelSource                                                                         ~> marketCancelFlow     ~> cancelSink
        tournamentChangeSource                                                                                             ~> Sink.ignore
        // @formatter:on

        ClosedShape
    })
}
