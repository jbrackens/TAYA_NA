package stella.leaderboard.server.routes

import play.api.Application
import play.api.ApplicationLoader
import play.api.ApplicationLoader.Context
import play.api.Environment

import stella.leaderboard.server.LeaderboardComponents

trait TestLeaderboardAppBuilder {
  def createLeaderboardComponents(context: Context): LeaderboardComponents

  def build(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env)
    createLeaderboardComponents(context).application
  }
}
