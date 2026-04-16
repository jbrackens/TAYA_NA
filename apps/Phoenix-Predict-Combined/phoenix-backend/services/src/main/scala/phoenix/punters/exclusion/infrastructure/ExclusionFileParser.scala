package phoenix.punters.exclusion.infrastructure

import scala.concurrent.Future
import scala.xml.Node
import scala.xml.Utility
import scala.xml.parsing.NoBindingFactoryAdapter

import akka.stream.IOResult
import akka.stream.alpakka.xml.scaladsl.XmlParsing
import akka.stream.scaladsl.Source
import akka.util.ByteString
import cats.data.Validated.Invalid
import cats.data.Validated.Valid
import javax.xml.transform.Transformer
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.sax.SAXResult
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.w3c.dom.Element

import phoenix.core.ScalaObjectUtils._
import phoenix.core.XmlUtils.XmlNodeReader.read
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.infrastructure.XmlFormats._

private[infrastructure] object ExclusionFileParser {
  type BinaryFile = Source[ByteString, Future[IOResult]]

  private val log: Logger = LoggerFactory.getLogger(this.objectName)

  def parse(xmlFile: BinaryFile): Source[ExcludedPlayer, Future[IOResult]] =
    xmlFile
      .via(XmlParsing.parser)
      .via(XmlParsing.subtree("DGE_Report" :: "excludedPlayers" :: Nil))
      .map(DomParser.toScalaXml)
      .mapConcat(attemptParse)

  private def attemptParse(xml: Node): Option[ExcludedPlayer] =
    read[ExcludedPlayer](xml) match {
      case Valid(punter) =>
        Some(punter)

      case Invalid(error) =>
        log.warn("Failed to parse ExcludedPlayer row [xml = {}, errors = {}]", Utility.trim(xml), error)
        None
    }
}

private object DomParser {
  private lazy val domTransformer: Transformer = {
    val transformerFactory = TransformerFactory.newInstance()
    transformerFactory.newTransformer()
  }

  def toScalaXml(element: Element): Node = {
    val dom = new DOMSource(element)
    val adapter = new NoBindingFactoryAdapter
    val saxResult = new SAXResult(adapter)
    domTransformer.transform(dom, saxResult)

    adapter.rootElem
  }
}
