package net.flipsports.gmx.streaming.common.job

case class MetaParameters(name: String, checkpointLocation: Option[String] = None) extends Serializable
