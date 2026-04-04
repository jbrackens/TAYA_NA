package stella.rules.models.event

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class FieldValueTypeSpec extends AnyFlatSpec with should.Matchers {

  "possible types" should "match types in Data API" in {
    FieldValueType.values.foreach { fieldValueType =>
      FieldValueType.withName(fieldValueType.entryName)
    }
  }
}
