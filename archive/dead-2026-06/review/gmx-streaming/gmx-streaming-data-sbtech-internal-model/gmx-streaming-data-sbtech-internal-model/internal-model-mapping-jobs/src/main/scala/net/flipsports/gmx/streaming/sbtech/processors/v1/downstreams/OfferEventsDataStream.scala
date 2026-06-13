package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.OfferEvents.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.OfferEvents._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class OfferEventsDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.OfferEvents(configuration), metaParameters, businessMetaParameters, configuration) {

}

object OfferEventsDataStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new OfferEventsDataStream(metaParameters, businessMetaParameters, config).stream()

}

