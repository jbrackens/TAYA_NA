package net.flipsports.gmx.streaming.data.v1

import com.idefix.events.{Event, EventWrapper}


object EventDataProvider extends DataProvider[Event] {

  override def sourceFile: String = "event.json"

  override def fromJson(json: String): Seq[Event] = EventWrapper.fromJsonList(json)

}

