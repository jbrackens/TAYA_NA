package stella.events.persistence

trait EventPublisher {
  def startPublisherLoop(): Unit

  def stopGracefully(): Unit
}
