package tech.argyll.gmx.predictorgame.common.play.api

case class ApiResponse[D](data: Option[D], error: Option[ApiError])
