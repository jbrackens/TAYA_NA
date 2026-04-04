package net.flipsports.gmx.common.internal.scala.play.api

case class ApiResponse[D](data: Option[D], error: Option[ApiError])
