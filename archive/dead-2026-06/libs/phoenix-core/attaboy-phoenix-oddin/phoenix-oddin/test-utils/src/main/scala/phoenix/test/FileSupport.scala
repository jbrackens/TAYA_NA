package phoenix.test

import scala.io.Source
import scala.xml.{ NodeSeq, XML }

trait FileSupport {
  import FileSupport._

  def getStringFromFile(fileName: String): String =
    Source.fromURL(getClass.getResource(s"$ResponsesDir/$fileName")).mkString

  def xml(fileName: String): NodeSeq = {
    val str = getStringFromFile(fileName)
    XML.loadString(str)
  }
}

object FileSupport {
  val ResponsesDir = "/data"
}
