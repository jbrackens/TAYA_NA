package gmx.common.internal.scala.test

import scala.io.Source

trait FileDataProvider[T] {

  def single: T = all(0)

  def all: Seq[T] = {
    val resource = Source.fromURL(this.getClass.getResource(sourceFile))
    val data     = resource.getLines().mkString
    fromJson(data)
  }

  protected def sourceFile: String

  protected def fromJson(json: String): Seq[T]
}
