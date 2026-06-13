package net.flipsports.gmx.streaming.internal.customers.operation.streams.joiner

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.StateChangeStream
import net.flipsports.gmx.streaming.internal.customers.operation.configs.Features
import net.flipsports.gmx.streaming.internal.customers.operation.dto.Streams
import net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams._
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class MultiStreamJoiner(businessMetaParameters: BusinessMetaParameters, features: Features) {



  def join(env: StreamExecutionEnvironment, streams: Streams)(implicit ec: ExecutionConfig): StateChangeStream = {
    val multiStreams = buildJoinedStreamsOnFeatures(env, features, streams)
    unionCollectedStreams(multiStreams)
  }


  protected def buildJoinedStreamsOnFeatures(env: StreamExecutionEnvironment, features: Features, streams: Streams)(implicit ec: ExecutionConfig): Seq[Option[StateChangeStream]] =
    Seq[Option[StateChangeStream]](
      withDataStreamIfEnabled(features.faccountMobileCasinoRegistration, FemaleMobileCasinoRegistrationDownstream(businessMetaParameters).processStream(streams.customers, env)),
      withDataStreamIfEnabled(features.faccountMobileRegistration, FemaleMobileRegistrationDownstream(businessMetaParameters).processStream(streams.customers, env)),
      withDataStreamIfEnabled(features.faccountRegistration, FemaleRegistrationDownstream(businessMetaParameters).processStream(streams.customers, env)),
      withDataStreamIfEnabled(features.faccountAffiliatesRegistration, AffiliatesFemaleRegistrationDownstream(businessMetaParameters).processStream(streams.customers, env)),
      withDataStreamIfEnabled(features.faccountBlockRegistration, FemaleBlockRegistrationDownstream(businessMetaParameters).processStream(streams.customers, env)),
      withDataStreamIfEnabled(features.faccountBlockExtensionRegistration, FemaleBlockExtensionRegistrationDownstream(businessMetaParameters).processStream(streams.customerLogins, env)),

      withDataStreamIfEnabled(features.canadianRegistration, CanadianRegistrationDownstream(businessMetaParameters).processStream(streams.customerLogins, env)),
      withDataStreamIfEnabled(features.irishRegistration, IrishRegistrationDownstream(businessMetaParameters).processStream(streams.customerLogins, env)),
      withDataStreamIfEnabled(features.undecidedRegistration, UndecidedCustomerRegistrationDownstream(businessMetaParameters).processStream(streams.customers, env)),
      withDataStreamIfEnabled(features.highValueCustomer, HighValueRegistrationDownstream(businessMetaParameters).processStream(streams.customerLogins, env)),
      withDataStreamIfEnabled(features.preferredSegmentPolicy, NewSegmentAccountRegistrationDownstream(businessMetaParameters).processStream(streams.customerLogins, env)),
      withDataStreamIfEnabled(features.dummyJoined, DummyJoinCustomerRegistrationDownstream(businessMetaParameters).processStream(streams.customerLogins, env)),
      withDataStreamIfEnabled(features.dummyPreJoinCustomer, DummyPreJoinCustomerRegistrationDownstream(businessMetaParameters).processStream(streams.customers, env)),
      withDataStreamIfEnabled(features.dummyPreJoinLogin, DummyPreJoinLoginsRegistrationDownstream(businessMetaParameters).processStream(streams.logins, env))
    )


  protected def unionCollectedStreams(downstreams: Seq[Option[StateChangeStream]]): StateChangeStream =
    downstreams
      .filter(_.isDefined)
      .map(_.get)
      .fold[StateChangeStream](null) { (left, right) =>
        if (left == null) right else left.union(right)
      }

  def withDataStreamIfEnabled(enabled: Boolean, candidate: => StateChangeStream): Option[StateChangeStream] =
    if (enabled) Some(candidate) else None

}


object MultiStreamJoiner {

  def apply(businessMetaParameters: BusinessMetaParameters, features: Features): MultiStreamJoiner = new MultiStreamJoiner(businessMetaParameters, features)

}
