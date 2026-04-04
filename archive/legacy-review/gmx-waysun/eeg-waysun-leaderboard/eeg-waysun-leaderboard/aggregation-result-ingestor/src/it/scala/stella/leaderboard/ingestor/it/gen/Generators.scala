package stella.leaderboard.ingestor.it.gen

import org.scalacheck.Arbitrary
import org.scalacheck.Gen

import stella.dataapi.aggregation.AggregationValues

object Generators {

  lazy val apiAggregationValuesGen: Gen[AggregationValues] =
    for {
      min <- Arbitrary.arbFloat.arbitrary
      max <- Arbitrary.arbFloat.arbitrary
      count <- Arbitrary.arbInt.arbitrary
      sum <- Arbitrary.arbFloat.arbitrary
      custom <- stringGen()
    } yield new AggregationValues(min, max, count, sum, custom)

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }
}
