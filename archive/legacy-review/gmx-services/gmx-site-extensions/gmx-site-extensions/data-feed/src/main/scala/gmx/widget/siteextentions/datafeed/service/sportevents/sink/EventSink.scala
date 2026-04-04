package gmx.widget.siteextentions.datafeed.service.sportevents.sink

import akka.stream.scaladsl.Sink

import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

trait EventSink[+Mat] {
  def provide: Sink[(StateUpdate, AvroEventRecord), Mat]
}
