package phoenix.shared.support

import java.io.BufferedInputStream

import akka.NotUsed
import akka.stream.alpakka.csv.scaladsl.CsvParsing
import akka.stream.alpakka.csv.scaladsl.CsvToMap
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Source
import akka.util.ByteString
import org.slf4j.Logger
import org.slf4j.LoggerFactory

final class CsvReader {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  def sourceCsvFile(resourcePath: String): Source[Map[String, String], NotUsed] = {
    val path = this.getClass.getClassLoader.getResource(resourcePath)
    log.debug(s"reading csv file at: $path")

    // we could just use "val source = FileIO.fromPath(Paths.get(path.toURI))" but Paths does not work for files included IN JAR ;/
    val bis = new BufferedInputStream(this.getClass.getClassLoader.getResourceAsStream(resourcePath))
    val source = Source.single(ByteString(bis.readAllBytes()))

    source
      .via(CsvParsing.lineScanner())
      .viaMat(CsvToMap.toMapAsStrings())(Keep.right)
      .filterNot(_.forall { case (_, value) => value.isEmpty })
      .map(_.map { case (key, value) => key.trim -> value.trim })
  }
}
