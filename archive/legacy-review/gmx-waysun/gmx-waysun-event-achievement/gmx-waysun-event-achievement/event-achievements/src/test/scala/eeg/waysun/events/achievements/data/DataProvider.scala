package eeg.waysun.events.achievements.data

import com.github.javafaker.Faker

import java.util.UUID

trait DataProvider[T, P] {

  val faker = new Faker()

  def single: T = all(1)(0)

  def all(size: Int, projectId: String = UUID.randomUUID().toString, payloadData: Option[Seq[P]] = None): Seq[T] = {
    (1 to size).map(item => buildFake(item, s"aggregationruleid-$item", projectId, payloadData))
  }

  def buildFake(item: Int, name: String, projectId: String, payloadData: Option[Seq[P]]): T

}
