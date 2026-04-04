package net.flipsports.gmx.streaming.idefix.processors.v1.aggregated

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.idefix.configs.{Features, IdefixConfig}
import net.flipsports.gmx.streaming.idefix.processors.v1.downstreams._
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment


class InternalModelMapperStream(features: Features, metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: IdefixConfig)
  extends CustomStream(metaParameters, businessMetaParameters) {

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit = {
    // event
    new EventStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)
  }
}

object InternalModelMapperStream {

  def execute(features: Features, metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: IdefixConfig): Unit = new InternalModelMapperStream(features, metaParameters, businessMetaParameters, config).stream()

}