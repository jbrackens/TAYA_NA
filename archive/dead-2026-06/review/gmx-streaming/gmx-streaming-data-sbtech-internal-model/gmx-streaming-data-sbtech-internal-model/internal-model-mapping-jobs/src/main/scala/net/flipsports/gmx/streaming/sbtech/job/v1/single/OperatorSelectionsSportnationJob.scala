package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.OperatorSelectionsDataStream

object OperatorSelectionsSportnationJob extends AbstractSbtechJobs("odds selections", new SportNationMetaParameters {}) {

  def main(args: Array[String]): Unit = OperatorSelectionsDataStream.execute(MetaParameters(name), businessMetaParams, config)

}