package net.flipsports.gmx.streaming.common.avro

import org.apache.avro.specific.{SpecificData, SpecificRecord}

object AvroUtilMapper extends Serializable {

  def specificData[V <: SpecificRecord](clazz: Class[V], source: Object): V =  {
    if (source == null) {
      source.asInstanceOf[V]
    } else {
      SpecificData.get().deepCopy(clazz.newInstance().getSchema, source).asInstanceOf[V]
    }
  }


}
