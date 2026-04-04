package stella.common.http.jwt

import java.util.UUID

import org.jose4j.jwt.JwtClaims
import org.scalatest.Inside.inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import stella.common.gen.Generators.secretBoxGen
import stella.common.http.crypt.SecretBoxUtils
import stella.common.http.jwt.JwtAuthorization.InvalidAuthTokenError
import stella.common.http.jwt.SecretBoxAuthContextExtractor.Names
import stella.common.models.Ids.UserId

class SecretBoxAuthContextExtractorSpec extends AnyFlatSpec with should.Matchers with ScalaCheckDrivenPropertyChecks {

  private val secretBoxHexKey = "ea87def016584b3c84e5cdbea4dcc868ea87def016584b3c84e5cdbea4dcc868"
  private val extractor = new SecretBoxAuthContextExtractor(secretBoxHexKey)
  private val correctTestSecretBox =
    "BzYxfTpIUhZwq9J4FaT2tlGekAcRFjsiYPSYD_o4cnjD_gEvTsBY9w9_YdFhERElF27tuMu9_6qJtZvgtSnxJ1OFXe4I10cQnrPyseNLIqeIYJ0" +
    "4B8KhGa1j7hhXC50W2VB7aCa-O9fLif4PWRnhBAixw0aiy9-et3E4Gdp6avdi-L3QySDqT8lLE3xbDGeQpkO5261_t3pfuVPPgBRfP4cO3yg4" +
    "gRsqAwKnXsKoVl7NykB36hfpD9cbicm6_KWCHQP0099rbnsS887ne1X2eDes3bwR3hcELaQOsyYiQ-AY2L5-nK5AwguQBCEei1zmyQP7M6AKw" +
    "xLcCwh21ASl1mCyN8_dw4OcfimQGeRHDhUZnLdUHxBC"
  private val sub = "f20dc338-6be4-421c-aa24-3ff6577d31fd"
  private val aud = "aud-is-some-id"

  "extract" should "succeed and return proper result for proper claims" in {
    forAll(secretBoxGen) { secretBox =>
      val json = SecretBox.secretBoxFormat.write(secretBox).toString
      val encryptedSecretBox = encryptSecretBox(json)
      val claims = claimsWithDefaultSubAndAud()
      claims.setStringClaim(Names.secretBoxName, encryptedSecretBox)
      inside(extractor.extract(claims)) { case Right(authContext) =>
        val expectedAuthContext =
          StellaAuthContext(
            PermissionsCollection(secretBox.jpk),
            UserId(UUID.fromString(sub)),
            secretBox.primaryProject,
            secretBox.additionalProjects)
        authContext shouldBe expectedAuthContext
      }
    }
  }

  it should "fail on missing secret box claim" in {
    val claims = claimsWithDefaultSubAndAud()
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"`${Names.secretBoxName}` claim is missing in $claims"
    }
  }

  it should "fail on failed secret box decryption" in {
    val claims = claimsWithDefaultSubAndAud()
    val incorrectSecretBox = "foo"
    claims.setStringClaim(Names.secretBoxName, incorrectSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, Some(_))) =>
      msg shouldBe s"Incorrect secret box $incorrectSecretBox"
    }
  }

  it should s"fail on missing ${Names.sub} claim" in {
    val claims = new JwtClaims()
    claims.setStringClaim(Names.secretBoxName, correctTestSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"`${Names.sub}` claim is missing in $claims"
    }
  }

  it should s"fail on incorrect ${Names.sub} claim" in {
    val claims = new JwtClaims()
    val incorrectSub = "test"
    claims.setStringClaim(Names.secretBoxName, correctTestSecretBox)
    claims.setSubject(incorrectSub)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"A value of claim `${Names.sub}` is `$incorrectSub` but it should be UUID"
    }
  }

  it should s"fail on missing ${Names.aud} claim" in {
    val claims = new JwtClaims()
    claims.setStringClaim(Names.secretBoxName, correctTestSecretBox)
    claims.setSubject(sub)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"`${Names.aud}` claim is missing in $claims"
    }
  }

  it should s"fail on missing ${Names.jpk} property" in {
    val claims = claimsWithDefaultSubAndAud()
    val incorrectSecretBox = encryptSecretBox(
      """{"primaryProject": "117ba0aa-fe0c-43b1-ab60-851391e96b44", "additionalProjects": []}""".stripMargin)
    claims.setStringClaim(Names.secretBoxName, incorrectSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"Property `${Names.jpk}` not found"
    }
  }

  it should s"fail on incorrect ${Names.jpk} property" in {
    val claims = claimsWithDefaultSubAndAud()
    val incorrectJpk = "it-is-not-array"
    val incorrectSecretBox = encryptSecretBox(s"""{"jpk": "$incorrectJpk",
                                                |"primaryProject": "117ba0aa-fe0c-43b1-ab60-851391e96b44",
                                                |"additionalProjects": []}""".stripMargin)
    claims.setStringClaim(Names.secretBoxName, incorrectSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"Invalid `${Names.jpk}`. Expected array but was $incorrectJpk"
    }
  }

  it should s"fail on missing ${Names.primaryProject} property" in {
    val claims = claimsWithDefaultSubAndAud()
    val incorrectSecretBox =
      encryptSecretBox("""{"jpk": ["oidc:operation:write"], "additionalProjects": []}""".stripMargin)
    claims.setStringClaim(Names.secretBoxName, incorrectSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"Property `${Names.primaryProject}` not found"
    }
  }

  it should s"fail on missing ${Names.additionalProjects} property" in {
    val claims = claimsWithDefaultSubAndAud()
    val incorrectSecretBox = encryptSecretBox(
      """{"jpk": ["oidc:operation:write"], "primaryProject": "117ba0aa-fe0c-43b1-ab60-851391e96b44"}""".stripMargin)
    claims.setStringClaim(Names.secretBoxName, incorrectSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"Property `${Names.additionalProjects}` not found"
    }
  }

  it should s"fail on ${Names.additionalProjects} property of wrong type" in {
    val claims = claimsWithDefaultSubAndAud()
    val incorrectAdditionalProjects = 42
    val incorrectSecretBox = encryptSecretBox(s"""{"jpk": ["oidc:operation:write"],
                                                |"primaryProject": "117ba0aa-fe0c-43b1-ab60-851391e96b44",
                                                |"additionalProjects": $incorrectAdditionalProjects}""".stripMargin)
    claims.setStringClaim(Names.secretBoxName, incorrectSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, None)) =>
      msg shouldBe s"Invalid `${Names.additionalProjects}`. Expected array but was $incorrectAdditionalProjects"
    }
  }

  it should s"fail on ${Names.additionalProjects} property when project id is not uuid" in {
    val claims = claimsWithDefaultSubAndAud()
    val incorrectSecretBox = encryptSecretBox("""{"jpk": ["oidc:operation:write"],
                                                |"primaryProject": "117ba0aa-fe0c-43b1-ab60-851391e96b44",
                                                |"additionalProjects": ["117ba0aa-fe0c-43b1-ab60-851391e96b44","wrong-id"]}""".stripMargin)
    claims.setStringClaim(Names.secretBoxName, incorrectSecretBox)
    inside(extractor.extract(claims)) { case Left(InvalidAuthTokenError(msg, Some(_: IllegalArgumentException))) =>
      msg shouldBe s"`${Names.additionalProjects}` should contain only UUIDs"
    }
  }

  private def claimsWithDefaultSubAndAud(): JwtClaims = {
    val claims = new JwtClaims()
    claims.setSubject(sub)
    claims.setAudience(aud)
    claims
  }

  private def encryptSecretBox(json: String): String =
    SecretBoxUtils.encrypt(json, secretBoxHexKey).getOrElse(fail(s"Secret box $json should be properly encrypted"))
}
