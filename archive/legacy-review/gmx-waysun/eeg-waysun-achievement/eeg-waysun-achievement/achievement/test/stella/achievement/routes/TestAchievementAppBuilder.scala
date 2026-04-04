package stella.achievement.routes

import play.api.Application
import play.api.ApplicationLoader
import play.api.ApplicationLoader.Context
import play.api.Environment

import stella.achievement.AchievementComponents

trait TestAchievementAppBuilder {
  def createAchievementComponents(context: Context): AchievementComponents

  def build(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env)
    createAchievementComponents(context).application
  }
}
