package gmx.service.internal.customer.tools.data

import java.io.{ FileReader, StringWriter }

import com.github.javafaker.Faker
import pl.szczepanik.silencio.api.Format
import pl.szczepanik.silencio.converters.StringConverter
import pl.szczepanik.silencio.core.Builder
import pl.szczepanik.silencio.decisions.MatcherDecision

object JsonAnonymization extends App {

  val filePath = args(0)

  val faker = new Faker()

  val input  = new FileReader(filePath)
  val output = new StringWriter

  val firstName = faker.name().firstName()
  val lastName  = faker.name().lastName()
  val builder   = new Builder(Format.JSON)
  builder
  // COMMON
    .`with`(new MatcherDecision(".*CustomerID.*", null), new PseudoEncrypt)
    .`with`(new MatcherDecision(".*CustomerName.*", null), new StringConverter(s"$firstName $lastName"))
    // LOGIN
    .`with`(new MatcherDecision(".*LoginName.*", null), new StringConverter(faker.internet().slug()))
    .`with`(new MatcherDecision(".*(LoginIP|LoginProxyIP).*", null), new StringConverter(faker.internet().publicIpV4Address()))
    // CUSTOMER DETAILS
    .`with`(new MatcherDecision(".*CustomerFirstName.*", null), new StringConverter(firstName))
    .`with`(new MatcherDecision(".*CustomerLastName.*", null), new StringConverter(lastName))
    .`with`(new MatcherDecision(".*CustomerMiddleName.*", null), Builder.BLANK)
    .`with`(new MatcherDecision(".*CustomerAlias.*", null), Builder.BLANK)
    .`with`(new MatcherDecision(".*Pesel.*", null), new StringConverter(faker.number().digits(11)))
    .`with`(new MatcherDecision(".*City.*", null), new StringConverter(faker.address().cityName()))
    .`with`(new MatcherDecision(".*Address.*", null), new StringConverter(faker.address().streetAddress()))
    .`with`(new MatcherDecision(".*ZipCode.*", null), new StringConverter(faker.address().zipCode()))
    .`with`(new MatcherDecision(".*Email.*", null), new StringConverter(faker.internet().emailAddress()))
    .`with`(new MatcherDecision(".*(FixedLinePhoneNumber|MobilePhoneNumber).*", null), new StringConverter(faker.phoneNumber().cellPhone()))
    .`with`(new MatcherDecision(".*DocumentID.*", null), Builder.BLANK)
    .`with`(new MatcherDecision(".*MerchantCustomerCode.*", null), new StringConverter(faker.internet().uuid()))
    .`with`(new MatcherDecision(".*OperatorIpAddress.*", null), new StringConverter(faker.internet().publicIpV4Address()))
    // WALLET TRANSACTION
    .`with`(new MatcherDecision(".*(WalletTransactionID|ChildTransactionID).*", null), new PseudoEncrypt)
    .`with`(new MatcherDecision(".*Notes.*", null), new WalletTransactionNotesResect)

  val processor = builder.build

  processor.load(input)
  processor.process()
  processor.write(output)

  System.out.println(output)

}
