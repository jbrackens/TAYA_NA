package phoenix.oddin.unit

import cats.data.NonEmptyList
import cats.data.Validated.Invalid
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.validation.ValidationException
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.marketDescription.MarketVariant
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeMarketSpecifiersOps

class MarketSpecifiersSpec extends AnyWordSpecLike with Matchers {

  "MarketSpecifiers" when {

    "parsing market specifiers" should {

      "parse well-formed specifiers string" in {

        val stringUnderTest = "variant=way:two|map=2|way=two"
        val expectedSpecifiersMap = Map("variant" -> "way:two", "map" -> "2", "way" -> "two")

        MarketSpecifiers.fromString(stringUnderTest).getOrElse(fail()).specifiersMap mustBe expectedSpecifiersMap
      }

      "parse well-formed specifiers string with multiple '=' chars in a single entry" in {

        val stringUnderTest = "variant=way:two=somethingelse|map=2|way=two"
        val expectedSpecifiersMap = Map("variant" -> "way:two=somethingelse", "map" -> "2", "way" -> "two")

        MarketSpecifiers.fromString(stringUnderTest).getOrElse(fail()).specifiersMap mustBe expectedSpecifiersMap
      }

      "parse a malformed specifiers string" in {

        val stringThatWillFailToSplitOnPipe = "variant=way:two|map|way=two"

        MarketSpecifiers.fromString(stringThatWillFailToSplitOnPipe) mustBe Invalid(
          NonEmptyList.one(
            ValidationException("Expected string of the form 'a=1|b=2', but received 'variant=way:two|map|way=two'")))
      }

      "parse a specifiers string with an empty right side of '='" in {

        val stringThatWillFailToSplitOnPipe = "variant=way:two|map=|way=two"

        MarketSpecifiers.fromString(stringThatWillFailToSplitOnPipe) mustBe Invalid(
          NonEmptyList.one(
            ValidationException("Expected string of the form 'a=1|b=2', but received 'variant=way:two|map=|way=two'")))
      }

      "parse a specifiers string with a blank left side of '='" in {

        val stringThatWillFailToSplitOnPipe = "variant=way:two|  =2|way=two"

        MarketSpecifiers.fromString(stringThatWillFailToSplitOnPipe) mustBe Invalid(
          NonEmptyList.one(
            ValidationException("Expected string of the form 'a=1|b=2', but received 'variant=way:two|  =2|way=two'")))
      }

      "generate the same orderedString given the same parameters in a different order" in {

        val first = MarketSpecifiers.fromString("variant=way:three|way=three|map=1").getOrElse(fail())
        val second = MarketSpecifiers.fromString("variant=way:three|map=1|way=three").getOrElse(fail())

        first.orderedString mustBe second.orderedString
      }
    }

    "comparing market variants" should {

      "return true for Some(variant) if variant exists and they match" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("variant=way:two|map=2|way=two")

        specifiers.hasVariantEqualTo(Some(MarketVariant("way:two"))) mustBe true
      }

      "return false for Some(variant) if variant exists and they don't match" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("variant=way:two|map=2|way=two")

        specifiers.hasVariantEqualTo(Some(MarketVariant("way:three"))) mustBe false
      }

      "return false for Some(variant) if variant does not exist" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("map=2|way=two")

        specifiers.hasVariantEqualTo(Some(MarketVariant("way:two"))) mustBe false
      }

      "return false for None if variant exists" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("variant=way:two|map=2|way=two")

        specifiers.hasVariantEqualTo(None) mustBe false
      }

      "return true for None if variant does not exist" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("map=2|way=two")

        specifiers.hasVariantEqualTo(None) mustBe true
      }
    }

    "formatting market name from market description" should {

      "return formatted market name with single matched specifier" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("variant=way:two|map=2|way=two")
        specifiers.formatMarketName("Match winner - {way}way") mustBe "Match winner - twoway"
      }

      "return formatted market name with multiple matched specifiers" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("map=1|variant=way:two|way=two")
        specifiers.formatMarketName("First half winner {way}way - map {map}") mustBe "First half winner twoway - map 1"
      }

      "return unchanged market name with unmatched specifier" in {
        val specifiers = MarketSpecifiers.fromStringUnsafe("map=1|variant=way:two|way=two")
        specifiers.formatMarketName("Match winner - {key}way") mustBe "Match winner - {key}way"
      }
    }
  }
}
