package gmx.widget.siteextentions.datafeed.test.shared

import scala.io.Source

import ujson.Value

import gmx.dataapi.internal.siteextensions._
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataRecord
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataUpdate

object DataRecordReader {

  def fromJson[T >: DataRecord](sourceFile: String): Seq[T] = {
    val resource = Source.fromURL(this.getClass.getResource(sourceFile))
    val data = resource.getLines.mkString

    val elements = ujson.read(data).asInstanceOf[ujson.Arr].value

    elements.map(elem => {
      val key = readKey(elem)
      DataUpdate(key, readValue(elem, key.getType))
    })
  }

  private def readKey[T >: DataRecord](elem: Value): SportEventUpdateKey = {
    SportEventUpdateKeyProvider.fromJson(elem("key").toString())
  }

  private def readValue[T >: DataRecord](elem: Value, elemType: SportEventUpdateType): SportEventUpdate = {
    val eventUpdate = SportEventUpdateProvider.fromJson(elem("value").toString(), elemType)
    eventUpdate
  }
}
