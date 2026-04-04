package gmx.widget.siteextentions.datafeed.service.sportevents

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.event.Logging
import akka.event.LoggingAdapter
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Source

import gmx.widget.siteextentions.datafeed.service.sportevents.flow.SportEventFlow
import gmx.widget.siteextentions.datafeed.service.sportevents.sink.EventSink
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataRecord
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

class SportEventFeed[InMat, OutMat](source: EventSource[InMat], flow: SportEventFlow, sink: EventSink[OutMat])(implicit
    system: ActorSystem[_]) {

  implicit val logger: LoggingAdapter = Logging(system.classicSystem, this.getClass)

  def runTopology(): (InMat, OutMat) = {
    source.provide
      .via(backpressureBuffer)
      .via(flow.provide)
      .toMat(sink.provide)(Keep.both)
      .named("flow-SportEventFeed")
      .run
  }

  // TODO (GM-1701): configure app to be able to switch off this batch step
  protected def backpressureBuffer: Flow[(DataRecord, AvroEventRecord), (DataRecord, AvroEventRecord), NotUsed] =
    Flow[(DataRecord, AvroEventRecord)]
      .batch(
        1000,
        u => {
          logger.debug(s"BACKPRESSURE ON - starting")
          List(u)
        })((acc, elem) => {
        logger.debug(s"BACKPRESSURE ON - buffered elements: ${acc.size + 1}")
        elem :: acc
      })
      .flatMapConcat(seq => {
        logger.debug(s"BACKPRESSURE OFF - received elements: ${seq.size}")
        Source(seq.reverse)
      })

}
