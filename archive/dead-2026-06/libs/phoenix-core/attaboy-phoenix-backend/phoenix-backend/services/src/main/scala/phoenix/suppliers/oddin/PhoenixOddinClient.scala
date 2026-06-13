package phoenix.suppliers.oddin

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.suppliers.oddin.kafka.Topic

trait PhoenixOddinClient {
  def connectTo[T](topic: Topic[T]): Source[T, NotUsed]
}
