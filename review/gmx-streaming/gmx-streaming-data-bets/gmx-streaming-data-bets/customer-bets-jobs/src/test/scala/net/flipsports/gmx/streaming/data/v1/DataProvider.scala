package net.flipsports.gmx.streaming.data.v1

import scala.io.Source

trait DataProvider[T] {

  def sourceFile: String

  def single: T = all(0)

  def all: Seq[T] = {
    val resource = Source.fromURL(this.getClass.getResource(s"/source/$sourceFile"))
    val data = resource.getLines.mkString
    fromJson(data)
  }

  def fromJson(json: String) : Seq[T]


}
