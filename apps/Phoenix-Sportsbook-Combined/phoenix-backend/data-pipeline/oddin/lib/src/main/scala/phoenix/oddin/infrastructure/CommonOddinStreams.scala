package phoenix.oddin.infrastructure

import akka.actor.typed.ActorSystem
import akka.stream.ClosedShape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Sink

import phoenix.dataapi.shared
import phoenix.dataapi.shared.MarketChange
import phoenix.oddin.domain.CommonOddinStreamingApi
import phoenix.oddin.domain.MarketDescriptionsRepository
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.domain.OddinStreamingApi.OddsChangeMessage
import phoenix.oddin.infrastructure.akkastreams._

final class CommonOddinStreams(
    adapter: OddinMessageAdapter,
    oddinRestApi: OddinRestApi,
    marketDescriptionsRepository: MarketDescriptionsRepository)(implicit system: ActorSystem[_])
    extends CommonOddinStreamingApi {

  override def buildRunnableGraph[M1, M2, M3, M4, M5](
      oddsChangeEventBuilderParallelism: Int,
      fixtureChangeEventBuilderParallelism: Int,
      marketChangeSink: Sink[MarketChange, M1],
      fixtureChangeSink: Sink[shared.FixtureChange, M2],
      marketSettlementSink: Sink[shared.FixtureResult, M3],
      marketCancelSink: Sink[shared.MarketCancel, M4],
      matchStatusUpdateSink: Sink[shared.MatchStatusUpdate, M5]): RunnableGraph[(M1, M2, M3, M4, M5)] =
    RunnableGraph.fromGraph(GraphDSL.createGraph(
      marketChangeSink,
      fixtureChangeSink,
      marketSettlementSink,
      marketCancelSink,
      matchStatusUpdateSink)((a, b, c, d, e) => (a, b, c, d, e)) {
      implicit builder: GraphDSL.Builder[(M1, M2, M3, M4, M5)] =>
        (marketChangeSink, fixtureSink, settlementSink, cancelSink, matchStatusSink) =>
          import GraphDSL.Implicits._

          val broadcastOdds = builder.add(Broadcast[OddsChangeMessage](2))

          // @formatter:off
          val oddsChangeSource = builder.add(adapter.oddsChanges)
          val oddsChangeFlow = builder.add(CommonMarketChangeFlow(marketDescriptionsRepository, oddsChangeEventBuilderParallelism))
          val oddsChangeMatchStatusFlow = builder.add(CommonMatchStatusUpdateFlow())
          val fixtureChangeSource = builder.add(adapter.fixtureChanges)
          val fixtureChangeFlow = builder.add(CommonFixtureChangeFlow(oddinRestApi, fixtureChangeEventBuilderParallelism))
          val marketSettlementSource = builder.add(adapter.marketSettlements)
          val marketSettlementFlow = builder.add(CommonMarketSettlementFlow())
          val marketCancelSource = builder.add(adapter.marketCancellations)
          val marketCancelFlow = builder.add(CommonMarketCancelFlow())
          val tournamentChangeSource = builder.add(adapter.tournamentChanges)

          oddsChangeSource       ~> broadcastOdds ~> oddsChangeFlow            ~> marketChangeSink
                                    broadcastOdds ~> oddsChangeMatchStatusFlow ~> matchStatusSink
          fixtureChangeSource                     ~> fixtureChangeFlow         ~> fixtureSink
          marketSettlementSource                  ~> marketSettlementFlow      ~> settlementSink
          marketCancelSource                      ~> marketCancelFlow          ~> cancelSink
          tournamentChangeSource                                               ~> Sink.ignore
          // @formatter:on

          ClosedShape
    })
}
