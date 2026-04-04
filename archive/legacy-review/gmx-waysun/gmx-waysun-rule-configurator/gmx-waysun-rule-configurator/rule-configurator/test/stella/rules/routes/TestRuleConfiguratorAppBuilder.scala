package stella.rules.routes

import play.api.Application
import play.api.ApplicationLoader
import play.api.ApplicationLoader.Context
import play.api.Environment

import stella.rules.RuleConfiguratorComponents

trait TestRuleConfiguratorAppBuilder {
  def createRuleConfiguratorComponents(context: Context): RuleConfiguratorComponents

  def build(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env)
    createRuleConfiguratorComponents(context).application
  }
}
