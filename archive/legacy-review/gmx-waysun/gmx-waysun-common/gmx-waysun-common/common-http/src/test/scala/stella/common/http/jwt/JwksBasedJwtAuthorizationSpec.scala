package stella.common.http.jwt

import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpec

import stella.common.http.jwt.JwtAuthorization.MissingPermissionsError
import stella.common.utils.SampleObjectFactory._

class JwksBasedJwtAuthorizationSpec extends AnyWordSpec with should.Matchers {
  private val testPermission1 = testPermission("perm1")
  private val testPermission2 = testPermission("perm2")
  private val testPermission3 = testPermission("perm3")

  "checkPermissions" should {
    "return error when there's no required permissions" in {
      val requiredPermissions = Seq(testPermission1, testPermission2)
      JwksBasedJwtAuthorization.checkPermissions(emptyPermissionsCollection, requiredPermissions) shouldBe Left(
        MissingPermissionsError(
          s"Missing permissions. Required one of [${testPermission1.value}, ${testPermission2.value}] but " +
          s"was $emptyPermissionsCollection"))

      val currentPermissions = PermissionsCollection(Set(testPermission3.value))
      JwksBasedJwtAuthorization.checkPermissions(currentPermissions, requiredPermissions) shouldBe Left(
        MissingPermissionsError(
          s"Missing permissions. Required one of [${testPermission1.value}, ${testPermission2.value}] but was " +
          currentPermissions))
    }

    "succeed when no permissions are required" in {
      JwksBasedJwtAuthorization.checkPermissions(
        emptyPermissionsCollection,
        requiredPermissions = Seq.empty) shouldBe Right(())
      val current = PermissionsCollection(Set(testPermission1.value))
      JwksBasedJwtAuthorization.checkPermissions(permissions = current, requiredPermissions = Seq.empty) shouldBe Right(
        ())
    }

    "succeed when at least one required permission is present" in {
      val currentPermissions1 = PermissionsCollection(Set(testPermission3.value, testPermission1.value))
      val requiredPermissions = Seq(testPermission1, testPermission2)
      JwksBasedJwtAuthorization.checkPermissions(currentPermissions1, requiredPermissions) shouldBe Right(())

      val currentPermissions2 = PermissionsCollection(Set(testPermission1.value, testPermission2.value))
      JwksBasedJwtAuthorization.checkPermissions(currentPermissions2, requiredPermissions) shouldBe Right(())
    }
  }
}
