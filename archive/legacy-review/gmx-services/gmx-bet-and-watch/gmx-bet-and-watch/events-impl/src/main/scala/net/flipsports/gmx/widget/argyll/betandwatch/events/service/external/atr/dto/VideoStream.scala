package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.BitrateLevel.BitrateLevel
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.MediaFormat.MediaFormat

case class VideoStream(id: Long, bitrate: BitrateLevel, format: MediaFormat, url: String)