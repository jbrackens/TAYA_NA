package net.flipsports.gmx.streaming.data.v1

import net.flipsports.gmx.streaming.sbtech.SourceTypes.Event.{KeyType, Source}
import org.apache.flink.api.java.tuple.Tuple2
import sbtech.sportsData.contracts.avro.EventsWrapper


object EventsDataProvider extends DataProvider[Source] {

  override def sourceFile: String = "events.json"

  override def fromJson(json: String): Seq[Source] = EventsWrapper
    .fromJsonList(json)
    .map(i =>
      new Tuple2(new KeyType(s"${i.getId.toString}"), i)
    )


  def allAsScala() = all.map(i => (i.f0, i.f1))

}

