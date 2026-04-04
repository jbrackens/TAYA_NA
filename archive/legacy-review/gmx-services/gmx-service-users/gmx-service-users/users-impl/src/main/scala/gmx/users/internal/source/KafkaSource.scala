package gmx.users.internal.source

import akka.actor.typed.{ ActorRef, ActorSystem }
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.typed.{ ClusterSingleton, SingletonActor }
import gmx.users.internal.source.KafkaConsumer.Command
import gmx.users.internal.source.sbtech.ProcessorSettings
import org.apache.avro.specific.SpecificRecord

class KafkaSource(
    system: ActorSystem[_],
    clusterSharding: ClusterSharding) {

  def init[KEY <: SpecificRecord, VALUE <: SpecificRecord](
      name: String,
      processorSettings: ProcessorSettings[KEY, VALUE]
    ): ActorRef[Command] =
    ClusterSingleton(system).init(
      SingletonActor(
        KafkaConsumer(clusterSharding, processorSettings),
        name
      )
    )
}
