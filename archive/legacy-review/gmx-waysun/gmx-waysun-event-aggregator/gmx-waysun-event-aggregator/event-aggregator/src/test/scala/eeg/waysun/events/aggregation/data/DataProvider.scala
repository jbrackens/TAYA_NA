package eeg.waysun.events.aggregation.data

import com.github.javafaker.Faker

import java.util.UUID

sealed trait DataProvider

object DataProvider {

  trait WithPayload[T, Payload] extends DataProvider {

    val faker = new Faker()

    def single(companyId: String = UUID.randomUUID().toString): T = all(size = 1, companyId).head

    // Please change Seq[T] = null => Seq[T] = Seq()
    def all(
        size: Int,
        companyId: String = UUID.randomUUID().toString,
        payloadData: Option[Seq[Payload]] = None): Seq[T] =
      (1 to size).map(item => buildFake(item, s"event-$item", companyId, payloadData))

    def buildFake(item: Int, name: String, companyId: String, payloadData: Option[Seq[Payload]]): T

  }

  trait WithoutPayload[T] extends DataProvider {

    val faker = new Faker()

    def single(companyId: String = UUID.randomUUID().toString): T = all(size = 1, companyId).head

    // Please change Seq[T] = null => Seq[T] = Seq()
    def all(size: Int, companyId: String = UUID.randomUUID().toString): Seq[T] =
      (1 to size).map(item => buildFake(item, s"event-$item", companyId))

    def buildFake(item: Int, name: String, companyId: String): T

  }
}
