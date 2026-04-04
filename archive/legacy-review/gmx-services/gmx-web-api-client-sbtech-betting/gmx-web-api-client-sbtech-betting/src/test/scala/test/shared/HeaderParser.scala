package test.shared

import com.softwaremill.sttp.Request

object HeaderParser {

  def findHeader(r: Request[_, _], headerName: String): Option[String] =
    r.headers.find(_._1.equalsIgnoreCase(headerName)).map(_._2)

}
