package net.flipsports.gmx.streaming.idefix.processors.v1.model

import org.apache.avro.specific.SpecificRecord

case class ClazzDefinition[K <: SpecificRecord, V <: SpecificRecord](sourceModelName: String, key: Class[K], value: Class[V])
