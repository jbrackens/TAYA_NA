package net.flipsports.gmx.streaming.sbtech

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object Implicits {

  object Failures {

    implicit val failedRows: TypeInformation[String] = TypeExtractor.getForClass(classOf[String])

  }

  object CasinoBet {

    implicit val sourceKey: TypeInformation[Types.CasinoBet.SourceKey] = TypeExtractor.getForClass(classOf[Types.CasinoBet.SourceKey])
    implicit val sourceValue: TypeInformation[Types.CasinoBet.SourceValue] = TypeExtractor.getForClass(classOf[Types.CasinoBet.SourceValue])

    implicit val targetKey: TypeInformation[Types.CasinoBet.TargetKey] = TypeExtractor.getForClass(classOf[Types.CasinoBet.TargetKey])
    implicit val targetValue: TypeInformation[Types.CasinoBet.TargetValue] = TypeExtractor.getForClass(classOf[Types.CasinoBet.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.CasinoBet.SourceKey, Types.CasinoBet.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.CasinoBet.SourceKey, Types.CasinoBet.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.CasinoBet.TargetKey, Types.CasinoBet.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.CasinoBet.TargetKey, Types.CasinoBet.TargetValue]], targetKey, targetValue)

  }

  object CustomerDetail {

    implicit val sourceKey: TypeInformation[Types.CustomerDetail.SourceKey] = TypeExtractor.getForClass(classOf[Types.CustomerDetail.SourceKey])
    implicit val sourceValue: TypeInformation[Types.CustomerDetail.SourceValue] = TypeExtractor.getForClass(classOf[Types.CustomerDetail.SourceValue])

    implicit val targetKey: TypeInformation[Types.CustomerDetail.TargetKey] = TypeExtractor.getForClass(classOf[Types.CustomerDetail.TargetKey])
    implicit val targetValue: TypeInformation[Types.CustomerDetail.TargetValue] = TypeExtractor.getForClass(classOf[Types.CustomerDetail.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.CustomerDetail.SourceKey, Types.CustomerDetail.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.CustomerDetail.SourceKey, Types.CustomerDetail.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.CustomerDetail.TargetKey, Types.CustomerDetail.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.CustomerDetail.TargetKey, Types.CustomerDetail.TargetValue]], targetKey, targetValue)

  }

  object SettlementData {

    implicit val sourceKey: TypeInformation[Types.SettlementData.SourceKey] = TypeExtractor.getForClass(classOf[Types.SettlementData.SourceKey])
    implicit val sourceValue: TypeInformation[Types.SettlementData.SourceValue] = TypeExtractor.getForClass(classOf[Types.SettlementData.SourceValue])

    implicit val targetKey: TypeInformation[Types.SettlementData.TargetKey] = TypeExtractor.getForClass(classOf[Types.SettlementData.TargetKey])
    implicit val targetValue: TypeInformation[Types.SettlementData.TargetValue] = TypeExtractor.getForClass(classOf[Types.SettlementData.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.SettlementData.SourceKey, Types.SettlementData.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.SettlementData.SourceKey, Types.SettlementData.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.SettlementData.TargetKey, Types.SettlementData.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.SettlementData.TargetKey, Types.SettlementData.TargetValue]], targetKey, targetValue)

  }


  object Logins {

    implicit val sourceKey: TypeInformation[Types.Logins.SourceKey] = TypeExtractor.getForClass(classOf[Types.Logins.SourceKey])
    implicit val sourceValue: TypeInformation[Types.Logins.SourceValue] = TypeExtractor.getForClass(classOf[Types.Logins.SourceValue])

    implicit val targetKey: TypeInformation[Types.Logins.TargetKey] = TypeExtractor.getForClass(classOf[Types.Logins.TargetKey])
    implicit val targetValue: TypeInformation[Types.Logins.TargetValue] = TypeExtractor.getForClass(classOf[Types.Logins.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.Logins.SourceKey, Types.Logins.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.Logins.SourceKey, Types.Logins.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.Logins.TargetKey, Types.Logins.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.Logins.TargetKey, Types.Logins.TargetValue]], targetKey, targetValue)

  }

  object WalletTransaction {

    implicit val sourceKey: TypeInformation[Types.WalletTransaction.SourceKey] = TypeExtractor.getForClass(classOf[Types.WalletTransaction.SourceKey])
    implicit val sourceValue: TypeInformation[Types.WalletTransaction.SourceValue] = TypeExtractor.getForClass(classOf[Types.WalletTransaction.SourceValue])

    implicit val targetKey: TypeInformation[Types.WalletTransaction.TargetKey] = TypeExtractor.getForClass(classOf[Types.WalletTransaction.TargetKey])
    implicit val targetValue: TypeInformation[Types.WalletTransaction.TargetValue] = TypeExtractor.getForClass(classOf[Types.WalletTransaction.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.WalletTransaction.SourceKey, Types.WalletTransaction.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.WalletTransaction.SourceKey, Types.WalletTransaction.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.WalletTransaction.TargetKey, Types.WalletTransaction.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.WalletTransaction.TargetKey, Types.WalletTransaction.TargetValue]], targetKey, targetValue)

  }

  object OperatorEvents {

    implicit val sourceKey: TypeInformation[Types.OperatorEvents.SourceKey] = TypeExtractor.getForClass(classOf[Types.OperatorEvents.SourceKey])
    implicit val sourceValue: TypeInformation[Types.OperatorEvents.SourceValue] = TypeExtractor.getForClass(classOf[Types.OperatorEvents.SourceValue])

    implicit val targetKey: TypeInformation[Types.OperatorEvents.TargetKey] = TypeExtractor.getForClass(classOf[Types.OperatorEvents.TargetKey])
    implicit val targetValue: TypeInformation[Types.OperatorEvents.TargetValue] = TypeExtractor.getForClass(classOf[Types.OperatorEvents.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.OperatorEvents.SourceKey, Types.OperatorEvents.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OperatorEvents.SourceKey, Types.OperatorEvents.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.OperatorEvents.TargetKey, Types.OperatorEvents.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OperatorEvents.TargetKey, Types.OperatorEvents.TargetValue]], targetKey, targetValue)

  }

  object OperatorMarkets {

    implicit val sourceKey: TypeInformation[Types.OperatorMarkets.SourceKey] = TypeExtractor.getForClass(classOf[Types.OperatorMarkets.SourceKey])
    implicit val sourceValue: TypeInformation[Types.OperatorMarkets.SourceValue] = TypeExtractor.getForClass(classOf[Types.OperatorMarkets.SourceValue])

    implicit val targetKey: TypeInformation[Types.OperatorMarkets.TargetKey] = TypeExtractor.getForClass(classOf[Types.OperatorMarkets.TargetKey])
    implicit val targetValue: TypeInformation[Types.OperatorMarkets.TargetValue] = TypeExtractor.getForClass(classOf[Types.OperatorMarkets.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.OperatorMarkets.SourceKey, Types.OperatorMarkets.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OperatorMarkets.SourceKey, Types.OperatorMarkets.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.OperatorMarkets.TargetKey, Types.OperatorMarkets.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OperatorMarkets.TargetKey, Types.OperatorMarkets.TargetValue]], targetKey, targetValue)

  }

  object OperatorSelections {

    implicit val sourceKey: TypeInformation[Types.OperatorSelections.SourceKey] = TypeExtractor.getForClass(classOf[Types.OperatorSelections.SourceKey])
    implicit val sourceValue: TypeInformation[Types.OperatorSelections.SourceValue] = TypeExtractor.getForClass(classOf[Types.OperatorSelections.SourceValue])

    implicit val targetKey: TypeInformation[Types.OperatorSelections.TargetKey] = TypeExtractor.getForClass(classOf[Types.OperatorSelections.TargetKey])
    implicit val targetValue: TypeInformation[Types.OperatorSelections.TargetValue] = TypeExtractor.getForClass(classOf[Types.OperatorSelections.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.OperatorSelections.SourceKey, Types.OperatorSelections.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OperatorSelections.SourceKey, Types.OperatorSelections.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.OperatorSelections.TargetKey, Types.OperatorSelections.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OperatorSelections.TargetKey, Types.OperatorSelections.TargetValue]], targetKey, targetValue)

  }

  object OfferEvents {
    implicit val sourceKey: TypeInformation[Types.OfferEvents.SourceKey] = TypeExtractor.getForClass(classOf[Types.OfferEvents.SourceKey])
    implicit val sourceValue: TypeInformation[Types.OfferEvents.SourceValue] = TypeExtractor.getForClass(classOf[Types.OfferEvents.SourceValue])

    implicit val targetKey: TypeInformation[Types.OfferEvents.TargetKey] = TypeExtractor.getForClass(classOf[Types.OfferEvents.TargetKey])
    implicit val targetValue: TypeInformation[Types.OfferEvents.TargetValue] = TypeExtractor.getForClass(classOf[Types.OfferEvents.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.OfferEvents.SourceKey, Types.OfferEvents.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OfferEvents.SourceKey, Types.OfferEvents.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.OfferEvents.TargetKey, Types.OfferEvents.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OfferEvents.TargetKey, Types.OfferEvents.TargetValue]], targetKey, targetValue)
  }

  object OfferOptions {
    implicit val sourceKey: TypeInformation[Types.OfferOptions.SourceKey] = TypeExtractor.getForClass(classOf[Types.OfferOptions.SourceKey])
    implicit val sourceValue: TypeInformation[Types.OfferOptions.SourceValue] = TypeExtractor.getForClass(classOf[Types.OfferOptions.SourceValue])

    implicit val targetKey: TypeInformation[Types.OfferOptions.TargetKey] = TypeExtractor.getForClass(classOf[Types.OfferOptions.TargetKey])
    implicit val targetValue: TypeInformation[Types.OfferOptions.TargetValue] = TypeExtractor.getForClass(classOf[Types.OfferOptions.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.OfferOptions.SourceKey, Types.OfferOptions.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OfferOptions.SourceKey, Types.OfferOptions.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.OfferOptions.TargetKey, Types.OfferOptions.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.OfferOptions.TargetKey, Types.OfferOptions.TargetValue]], targetKey, targetValue)
  }
}
