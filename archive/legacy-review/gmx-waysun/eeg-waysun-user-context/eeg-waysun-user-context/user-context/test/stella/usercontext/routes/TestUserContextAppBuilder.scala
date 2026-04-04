package stella.usercontext.routes

import play.api.Application
import play.api.ApplicationLoader
import play.api.ApplicationLoader.Context
import play.api.Environment

import stella.usercontext.UserContextComponents

class TestUserContextAppBuilder {
  def createUserContextComponents(context: Context): UserContextComponents = new UserContextComponents(context: Context)

  def build(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env)
    createUserContextComponents(context).application
  }
}
