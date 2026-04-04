package stella.usercontext.it

import org.scalamock.scalatest.MockFactory
import org.scalatestplus.play.FakeApplicationFactory
import play.api.Application
import play.api.ApplicationLoader
import play.api.Environment

import stella.common.http.jwt.DisabledJwtAuthorization
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext

import stella.usercontext.UserContextComponents

trait IntegrationTestApplicationFactory extends FakeApplicationFactory with MockFactory {

  protected lazy val jwtAuth: JwtAuthorization[StellaAuthContext] = new DisabledJwtAuthorization()
  protected lazy val initialSettings: Map[String, AnyRef] = Map.empty

  override def fakeApplication(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env, initialSettings)
    val components = new UserContextComponents(context) {
      override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth
    }
    components.application
  }
}
