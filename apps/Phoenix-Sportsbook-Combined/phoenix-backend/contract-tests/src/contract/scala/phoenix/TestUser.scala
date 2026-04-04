package phoenix

import scala.util.Random

final case class User(
    name: PersonalName,
    credentials: UserCredentials,
    email: String,
    phoneNumber: String,
    address: Address,
    dateOfBirth: DateOfBirth,
    gender: Option[Gender],
    ssn: String)
final case class UserCredentials(username: String, password: String)
final case class PersonalName(title: String, firstName: String, lastName: String)
final case class DeviceFingerprint(visitorId: String, confidence: String)
final case class Gender(value: String)
final case class Address(addressLine: String, city: String, state: String, zipcode: String, country: String)
final case class DateOfBirth(day: Int, month: Int, year: Int)

// We can use this until we have more sophisticated mechanisms like KYC enabled
trait TestUser extends AuthRequests {

  def randomUserWithFixedPassword(): User = {
    val name = PersonalName("Mr", "Contract", "Tests")
    // Let's use a predictable password for all users so that we can log in to them after the contract tests are complete.
    val credentials = UserCredentials(username = s"contract_tests_${randomString()}", password = "Th3P@ssw0rd!")
    val email = s"${credentials.username}@example.com"
    val phoneNumber = "+12666666666"
    val address =
      Address("Whatever Street, District XYZ, 10", "Newark", "NJ", randomZipcode(), "US")
    val dateOfBirth = randomDateOfBirth()
    val ssn = LazyList.continually(Random.between(0, 10)).take(9).mkString
    val gender = Gender("male")

    User(name, credentials, email, phoneNumber, address, dateOfBirth, Some(gender), ssn)
  }

  private def randomString(length: Int = 32): String =
    Random.alphanumeric.take(length).mkString

  def randomDateOfBirth(): DateOfBirth =
    DateOfBirth(day = 1 + Random.nextInt(27), month = 1 + Random.nextInt(12), year = 1930 + Random.nextInt(65))

  def randomZipcode(): String =
    Seq.fill(5)(Random.between(0, 10)).mkString
}
