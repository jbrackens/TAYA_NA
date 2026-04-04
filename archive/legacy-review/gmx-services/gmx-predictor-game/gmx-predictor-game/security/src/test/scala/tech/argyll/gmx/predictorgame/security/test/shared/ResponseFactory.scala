package tech.argyll.gmx.predictorgame.security.test.shared

import com.softwaremill.sttp.{Request, Response}

trait ResponseFactory {
  def produceResponse(req: Request[_, _]): Response[String]
}
