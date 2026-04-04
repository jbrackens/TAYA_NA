package phoenix.oddin.domain

import scala.collection.immutable.ListMap

import cats.syntax.traverse._
import cats.syntax.validated._

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException
import phoenix.oddin.domain.marketDescription.MarketVariant

final case class MarketSpecifiers private (specifiersMap: Map[String, String]) {
  import MarketSpecifiers._

  def orderedString: String = {
    val orderedMap = ListMap(specifiersMap.toSeq.sortBy(_._1): _*)
    orderedMap.map(_.productIterator.mkString("=")).mkString("|")
  }

  def hasVariantEqualTo(maybeVariant: Option[MarketVariant]): Boolean =
    specifiersMap.get(VariantKey) match {
      case Some(variant) => maybeVariant.exists(_.value == variant)
      case None          => maybeVariant.isEmpty
    }

  def formatMarketName(marketDescriptionName: String): String = {
    val keys = marketDescriptionName.split('{').tail.map(_.split('}').head)
    keys.fold(marketDescriptionName)((prev, k) => {
      specifiersMap.get(synonymFor(k)).fold(prev)(value => prev.replace(s"{$k}", value))
    })
  }
}

object MarketSpecifiers {

  private val VariantKey = "variant"
  private val Synonyms = Map("type" -> "kind")
  private def synonymFor(key: String): String = Synonyms.getOrElse(key, key)

  def fromString(str: String): Validation[MarketSpecifiers] = {
    val list: List[Validation[(String, String)]] = str
      .split("""\|""")
      .map { kv =>
        val arr = kv.split("=", 2).toList
        if (arr.length == 2 && arr.forall(str => str.nonEmpty && !str.isBlank)) {
          (arr(0), arr(1)).validNel
        } else {
          ValidationException(s"Expected string of the form 'a=1|b=2', but received '$str'").invalidNel
        }
      }
      .toList

    list.sequence.map(pairs => MarketSpecifiers(pairs.toMap))
  }
}
