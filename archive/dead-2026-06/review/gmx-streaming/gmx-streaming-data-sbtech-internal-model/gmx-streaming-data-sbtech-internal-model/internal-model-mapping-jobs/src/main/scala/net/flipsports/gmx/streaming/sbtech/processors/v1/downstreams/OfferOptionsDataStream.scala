package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.OfferOptions.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.OfferOptions._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class OfferOptionsDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.OfferOptions(configuration), metaParameters, businessMetaParameters, configuration) {

}

object OfferOptionsDataStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new OfferOptionsDataStream(metaParameters, businessMetaParameters, config).stream()

}

