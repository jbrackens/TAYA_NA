package com.betconstruct.avro.enigma.details

class MapBasedEvent(val map: Map[String, Object]) {

  def get[T](field: String) : T = {
    map.get(field)
      .map(_.asInstanceOf[T])
      .getOrElse(null.asInstanceOf[T])
  }

  def getLong(field: String): Long = map.get(field).map[Long] {
    case i: java.lang.Integer => i.toLong
    case l: java.lang.Long => l
    case null => null.asInstanceOf[Long]
  }.getOrElse(null.asInstanceOf[Long])


  override def toString: String = s"Event: [${map.toString()}]"

  def ServiceInfo: String = get("ServiceInfo")

}
