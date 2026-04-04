package gmx.widget.siteextentions.datafeed.service.sportevents.sink

import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import com.typesafe.scalalogging.LazyLogging

import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.StoreUpdateMessageService
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataRecord
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

class DBEventSink(service: StoreUpdateMessageService) extends EventSink[Future[Done]] with LazyLogging {

  lazy val provide: Sink[(StateUpdate, AvroEventRecord), Future[Done]] = Sink.foreach[(StateUpdate, AvroEventRecord)] {
    case (stateUpdate, avroEventRecord) => service.storeUpdateFromSink(stateUpdate, avroEventRecord)
  }
}
