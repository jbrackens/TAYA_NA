package net.flipsports.gmx.streaming.sbtech.processors.v1

import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import org.apache.avro.specific.SpecificRecord

case class MapperBusinessParameters[K, V <: SpecificRecord, TK <: SpecificRecord, TV <: SpecificRecord](
 sourceTopic: String,
 targetTopic: String,
 sourceKeyClass: Class[K],
 sourceValueClass: Class[V],
 targetKeyClass: Class[TK],
 targetValueCLass: Class[TV],
 keyMapper: (K, TV) => TK
) extends Serializable


object MapperBusinessParameters {

  object CasinoBetParams {
    import Types.CasinoBet._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.casinoBets,
      targetTopic = configuration.targetTopics.casinoBets,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, i) => new TargetKey(i.getCustomerID)
    )
  }

  object CustomerDetailParams {
    import Types.CustomerDetail._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.customerDetails,
      targetTopic = configuration.targetTopics.customerDetails,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, i) => new TargetKey(i.getCustomerID)
    )
  }

  object SportBets {
    import Types.SettlementData._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.sportBetsInfo,
      targetTopic = configuration.targetTopics.sportBetsInfo,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, i) => new TargetKey(i.getPurchase.getCustomer.getCustomerID)
    )
  }

  object WalletTransaction {
    import Types.WalletTransaction._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.walletTransaction,
      targetTopic = configuration.targetTopics.walletTransaction,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, i) => new TargetKey(i.getCustomerID)
    )
  }

  object Logins {
    import Types.Logins._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.logins,
      targetTopic = configuration.targetTopics.logins,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, i) => new TargetKey(i.getCustomerID)
    )
  }


  object OperatorEvents {
    import Types.OperatorEvents._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.operatorEvents,
      targetTopic = configuration.targetTopics.operatorEvents,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (key, _) => new TargetKey(key)
    )
  }

  object OperatorMarkets {
    import Types.OperatorMarkets._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.operatorMarkets,
      targetTopic = configuration.targetTopics.operatorMarkets,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (key, _) => new TargetKey(key)
    )
  }

  object OperatorSelections {
    import Types.OperatorSelections._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.operatorSelections,
      targetTopic = configuration.targetTopics.operatorSelections,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (key, _) => new TargetKey(key)
    )
  }

  object OfferEvents {
    import Types.OfferEvents._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.offerEvents,
      targetTopic = configuration.targetTopics.offerEvents,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, value) => new TargetKey(value.getEventID)
    )
  }
  object OfferOptions {
    import Types.OfferOptions._

    def apply(configuration: SbTechConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.offerOptions,
      targetTopic = configuration.targetTopics.offerOptions,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, value) => new TargetKey(value.getLineId, value.getEventId)
    )
  }
}