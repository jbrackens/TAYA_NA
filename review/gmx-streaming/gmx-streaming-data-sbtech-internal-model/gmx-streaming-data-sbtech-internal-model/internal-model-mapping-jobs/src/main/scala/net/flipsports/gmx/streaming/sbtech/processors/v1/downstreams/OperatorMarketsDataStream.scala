package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams



import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.OperatorMarkets.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.OperatorMarkets._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class OperatorMarketsDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.OperatorMarkets(configuration), metaParameters, businessMetaParameters, configuration) {

}

object OperatorMarketsDataStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new OperatorMarketsDataStream(metaParameters, businessMetaParameters, config).stream()

}

