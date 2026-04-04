package phoenix.support

trait FileSupport {

  def stringFromResource(baseDir: String = "data", fileName: String) =
    scala.io.Source.fromResource(s"$baseDir/$fileName").mkString
}
