package phoenix.streams

import akka.stream.scaladsl.Flow
import io.scalaland.chimney.Transformer

object CommonFlows {

  def transform[From, To](implicit t: Transformer[From, To]) = Flow[From].map(t.transform)

  def transformConcat[From, To](implicit t: Transformer[From, Seq[To]]) = Flow[From].mapConcat(t.transform)

}
