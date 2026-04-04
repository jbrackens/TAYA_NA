package stella.usercontext.gen

import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import play.api.libs.json.JsArray
import play.api.libs.json.JsBoolean
import play.api.libs.json.JsNull
import play.api.libs.json.JsNumber
import play.api.libs.json.JsObject
import play.api.libs.json.JsString
import play.api.libs.json.JsValue

object Generators {

  lazy val jsonObjectGen: Gen[JsValue] = {
    val maxSize = 5
    for {
      fields <- Gen.listOfN(maxSize, jsonFieldGen)
    } yield {
      val distinctFields = fields.distinctBy { case (fieldName, _) => fieldName }
      JsObject(distinctFields)
    }
  }

  lazy val jsonFieldGen: Gen[(String, JsValue)] = for {
    name <- stringGen(minSize = 1, maxSize = 50)
    value <- jsonGen
  } yield (name, value)

  lazy val jsonGen: Gen[JsValue] =
    Gen.oneOf(jsNullGen, jsBooleanGen, jsNumberGen, jsStringGen, jsArrayGen, jsonObjectGen)
  lazy val flatJsonGen: Gen[JsValue] = Gen.oneOf(jsNullGen, jsBooleanGen, jsNumberGen, jsStringGen)

  lazy val jsNullGen: Gen[JsNull.type] = Gen.const(JsNull)
  lazy val jsBooleanGen: Gen[JsBoolean] = Arbitrary.arbBool.arbitrary.map(JsBoolean)
  lazy val jsNumberGen: Gen[JsNumber] = Arbitrary.arbBigDecimal.arbitrary.map(JsNumber)
  lazy val jsStringGen: Gen[JsString] = stringGen().map(JsString)

  lazy val jsArrayGen: Gen[JsArray] = {
    val maxSize = 3
    Gen.listOfN(maxSize, flatJsonGen).map(JsArray(_))
  }

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }
}
