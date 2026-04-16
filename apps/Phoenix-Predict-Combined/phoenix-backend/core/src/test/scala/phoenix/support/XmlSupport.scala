package phoenix.support

import scala.util.Try
import scala.xml.Elem
import scala.xml.XML

import advxml.core.transform.XmlRule
import advxml.implicits._

trait XmlSupport extends FileSupport {

  def withXmlStringFromResource[T](baseDir: String, fileName: String, f: Elem => T): T = {
    val str = stringFromResource(baseDir, fileName)
    val xml = XML.loadString(str)
    f(xml)
  }

  /**
   * Transform XML using rules from advxml library
   * https://github.com/geirolz/advxml
   * @param xml xml as string
   * @param rules list of rules to be applied on the xml
   * @return transformed xml string or exception if rules cannot be applied
   */
  def unsafeTransformXML(xml: String, rules: XmlRule*): String = {
    val doc = XML.loadString(xml)
    doc.transform[Try](rules.toList).get.toString
  }
}
