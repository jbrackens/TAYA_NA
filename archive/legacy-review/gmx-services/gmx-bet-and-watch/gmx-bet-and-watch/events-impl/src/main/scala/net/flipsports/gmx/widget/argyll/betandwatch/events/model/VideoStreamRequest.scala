package net.flipsports.gmx.widget.argyll.betandwatch.events.model

import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.DeviceType.DeviceType

case class VideoStreamRequest(providerEventId: String, userId: String, partner: String, device: DeviceType)
