package net.flipsports.gmx.streaming.common.job

import org.apache.avro.generic.GenericRecord

trait GenericRecordAware[TARGET] extends Serializable {

  def asSpecific: GenericRecord => TARGET  =  { source =>
    val json = source.toString
    fromJsonToRecord(json)
  }


  def fromJsonToRecord(source: String): TARGET
}
