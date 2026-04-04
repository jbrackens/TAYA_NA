package eeg.waysun.events.aggregation

import eeg.waysun.events.aggregation.Types.AggregationResult.SinkType
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object Implicits {

  object EventOccurrenceImplicit {
    val key: TypeInformation[Types.EventOccurrence.KeyType] =
      TypeExtractor.getForClass(classOf[Types.EventOccurrence.KeyType])

    val value: TypeInformation[Types.EventOccurrence.ValueType] =
      TypeExtractor.getForClass(classOf[Types.EventOccurrence.ValueType])

    val keyed: TypeInformation[Types.EventOccurrence.KeyedType] =
      TypeExtractor.getForClass(Types.EventOccurrence.keyedClass)
  }

  object ValidatedImplicit {
    val key: TypeInformation[Types.Validated.KeyType] =
      TypeExtractor.getForClass(Types.Validated.keyClass)

    val value: TypeInformation[Types.Validated.ValueType] =
      TypeExtractor.getForClass(Types.Validated.valueClass)

    val source: TypeInformation[Types.Validated.Source] =
      new TupleTypeInfo(Types.Validated.sourceClass, key, value)

    val keyed: TypeInformation[Types.Validated.KeyedType] =
      TypeExtractor.getForClass(Types.Validated.keyedClass)

  }

  object AggregationsInProjectImplicit {

    val key: TypeInformation[Types.AggregationsInProjects.KeyType] =
      TypeExtractor.getForClass(Types.AggregationsInProjects.keyClass)

    val value: TypeInformation[Types.AggregationsInProjects.ValueType] =
      TypeExtractor.getForClass(Types.AggregationsInProjects.valueClass)

    val values: TypeInformation[Types.AggregationsInProjects.ValuesType] =
      TypeExtractor.getForClass(Types.AggregationsInProjects.valuesClass)

    val keyed: TypeInformation[Types.AggregationsInProjects.KeyedType] =
      TypeExtractor.getForClass(Types.AggregationsInProjects.keyedClass)
  }

  object AggregationDefinitionImplicit {

    val key: TypeInformation[Types.AggregationDefinition.KeyType] =
      TypeExtractor.getForClass(classOf[Types.AggregationDefinition.KeyType])

    val value: TypeInformation[Types.AggregationDefinition.ValueType] =
      TypeExtractor.getForClass(classOf[Types.AggregationDefinition.ValueType])

    val source: TypeInformation[Types.AggregationDefinition.Source] =
      new TupleTypeInfo(Types.AggregationDefinition.sourceClass, key, value)

    val keyed: TypeInformation[Types.AggregationDefinition.KeyedType] =
      TypeExtractor.getForClass(classOf[Types.AggregationDefinition.KeyedType])

  }

  object AggregationCandidateImplicit {

    val key: TypeInformation[Types.AggregationCandidate.KeyType] =
      TypeExtractor.getForClass(Types.AggregationCandidate.keyClass)

    val keyed: TypeInformation[Types.AggregationCandidate.KeyedType] =
      TypeExtractor.getForClass(Types.AggregationCandidate.keyedClass)

  }

  object AggregationOccurrenceImplicit {

    val key: TypeInformation[Types.AggregationOccurrence.KeyType] =
      TypeExtractor.getForClass(Types.AggregationOccurrence.keyClass)

    val keyed: TypeInformation[Types.AggregationOccurrence.KeyedType] =
      TypeExtractor.getForClass(Types.AggregationOccurrence.keyedClass)

  }

  object AggregationInstanceImplicit {
    val key: TypeInformation[Types.AggregationResult.KeyType] =
      TypeExtractor.getForClass(classOf[Types.AggregationResult.KeyType])

    val windowKey: TypeInformation[Types.AggregationResult.WindowKeyType] =
      TypeExtractor.getForClass(Types.AggregationResult.windowKeyClass)

    val keyed: TypeInformation[Types.AggregationResult.KeyedType] =
      TypeExtractor.getForClass(classOf[Types.AggregationResult.KeyedType])

  }

  object AggregationControlImplicit {

    val key: TypeInformation[Types.AggregationControl.KeyType] =
      TypeExtractor.getForClass(classOf[Types.AggregationControl.KeyType])

    val value: TypeInformation[Types.AggregationControl.ValueType] =
      TypeExtractor.getForClass(classOf[Types.AggregationControl.ValueType])

    val source: TypeInformation[Types.AggregationControl.Source] =
      new TupleTypeInfo(Types.AggregationControl.sourceClass, key, value)

    val keyed: TypeInformation[Types.AggregationControl.KeyedType] =
      TypeExtractor.getForClass(classOf[Types.AggregationControl.KeyedType])

  }

  object AggregationResultImplicit {

    val key: TypeInformation[Types.AggregationResult.KeyType] =
      TypeExtractor.getForClass(Types.AggregationResult.keyClass)

    val value: TypeInformation[Types.AggregationResult.ValueType] =
      TypeExtractor.getForClass(Types.AggregationResult.valueClass)

    val keyed: TypeInformation[Types.AggregationResult.KeyedType] =
      TypeExtractor.getForClass(Types.AggregationResult.keyedClass)

    val sink: TupleTypeInfo[Types.AggregationResult.SinkType] =
      new TupleTypeInfo[SinkType](Types.AggregationResult.sinkClass, key, value)
  }
}
