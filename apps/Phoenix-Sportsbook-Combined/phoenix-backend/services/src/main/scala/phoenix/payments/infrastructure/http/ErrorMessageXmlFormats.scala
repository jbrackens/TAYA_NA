package phoenix.payments.infrastructure.http

import scala.xml.Node

import phoenix.core.XmlUtils.XmlFormat
import phoenix.core.XmlUtils.XmlWriter
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationError

private[http] object ErrorMessageXmlFormats {
  implicit val errorResponseFormat: XmlFormat[ErrorResponse] = XmlFormat.writeOnly(errorResponseWriter)

  private lazy val errorResponseWriter: XmlWriter[ErrorResponse] = new XmlWriter[ErrorResponse] {
    override def write(errorResponse: ErrorResponse): Node =
      <errorResponse>
        <status>{errorResponse.status}</status>
        <errors>{for (error <- errorResponse.errors.toList) yield toXml(error)}</errors>
      </errorResponse>

    private def toXml(error: PresentationError): Node =
      <error>
        <errorCode>{error.errorCode.value}</errorCode>
        <details>{for (details <- error.details.toList) yield <message>{details.message}</message>}</details>
      </error>
  }
}
