package net.flipsports.gmx.streaming.idefix

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object Implicits {

  object Failures {

    implicit val failedRows: TypeInformation[String] = TypeExtractor.getForClass(classOf[String])

  }

  object Event {

    implicit val sourceKey: TypeInformation[Types.Event.SourceKey] = TypeExtractor.getForClass(classOf[Types.Event.SourceKey])
    implicit val sourceValue: TypeInformation[Types.Event.SourceValue] = TypeExtractor.getForClass(classOf[Types.Event.SourceValue])

    implicit val targetKey: TypeInformation[Types.Event.TargetKey] = TypeExtractor.getForClass(classOf[Types.Event.TargetKey])
    implicit val targetValue: TypeInformation[Types.Event.TargetValue] = TypeExtractor.getForClass(classOf[Types.Event.TargetValue])

    implicit val input: TupleTypeInfo[Tuple2[Types.Event.SourceKey, Types.Event.SourceValue]] = new TupleTypeInfo(classOf[Tuple2[Types.Event.SourceKey, Types.Event.SourceValue]], sourceKey, sourceValue)
    implicit val output: TupleTypeInfo[Tuple2[Types.Event.TargetKey, Types.Event.TargetValue]] = new TupleTypeInfo(classOf[Tuple2[Types.Event.TargetKey, Types.Event.TargetValue]], targetKey, targetValue)

  }

}
