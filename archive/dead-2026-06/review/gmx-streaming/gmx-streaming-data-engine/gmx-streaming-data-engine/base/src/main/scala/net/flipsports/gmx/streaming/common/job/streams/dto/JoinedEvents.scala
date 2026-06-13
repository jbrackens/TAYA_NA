package net.flipsports.gmx.streaming.common.job.streams.dto

case class JoinedEvents[EK, EV, BEK, BEV](event: KeyValue[EK, EV], broadcastEvent: KeyValueOpt[BEK, BEV])
