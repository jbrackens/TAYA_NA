package phoenix.utils.dge

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.domain.DUPI
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.LastName
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateLastName
import phoenix.support.UserGenerator.generateSocialSecurityNumber

final class DUPISpec extends AnyWordSpecLike with Matchers {
  "should be able to create Uniform Patron Identifier for random last name" in {
    val lastName = LastName(generateLastName().value).unsafe()
    val dateOfBirth = DateOfBirth(1, 11, 1988)
    val last4DigitsOfSSN = generateSocialSecurityNumber()
    val dupi = DUPI(lastName, dateOfBirth, last4DigitsOfSSN)

    dupi.value.size shouldBe 32
    dupi.value shouldBe s"${lastName.value.toLowerCase().concat("xxxxxxxxxxxxxxxxxx").take(20)}01111988${last4DigitsOfSSN.value}"
  }

  "should be able to create Uniform Patron Identifier for short last name" in {
    val lastName = LastName("Snow").unsafe()
    val dateOfBirth = DateOfBirth(1, 11, 1988)
    val last4DigitsOfSSN = Last4DigitsOfSSN("3421")
    val dupi = DUPI(lastName, dateOfBirth, last4DigitsOfSSN)

    dupi.value.size shouldBe 32
    dupi.value shouldBe "snowxxxxxxxxxxxxxxxx011119883421"
  }

  "should be able to create Uniform Patron Identifier for big last name" in {
    val lastName = LastName("Alessandra-Ocasio-Cortez").unsafe()
    val dateOfBirth = DateOfBirth(1, 11, 1966)
    val last4DigitsOfSSN = Last4DigitsOfSSN("4421")
    val dupi = DUPI(lastName, dateOfBirth, last4DigitsOfSSN)

    dupi.value.size shouldBe 32
    dupi.value shouldBe "alessandraocasiocort011119664421"
  }
}
