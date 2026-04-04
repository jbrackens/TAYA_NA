package stella.common.gen

import org.scalacheck.Arbitrary
import org.scalacheck.Gen

import stella.common.http.jwt.SecretBox
import stella.common.models.Ids.ProjectId
import stella.common.test.instances._

object Generators {

  lazy val secretBoxGen: Gen[SecretBox] =
    for {
      orig <- Arbitrary.arbUuid.arbitrary
      permissions <- Gen.listOf(stringGen(minSize = 1))
      primaryProject <- Arbitrary.arbitrary[ProjectId]
      additionalProjects <- Gen.listOf(Arbitrary.arbitrary[ProjectId]).map(_.toSet)
    } yield SecretBox(orig, jpk = permissions.toSet, primaryProject, additionalProjects)

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }
}
