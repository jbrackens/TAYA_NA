package stella.wallet.routes

import play.api.Application
import play.api.ApplicationLoader
import play.api.ApplicationLoader.Context
import play.api.Environment

import stella.wallet.WalletComponents

class TestWalletAppBuilder {
  def createWalletComponents(context: Context): WalletComponents = new WalletComponents(context: Context)

  def build(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env)
    createWalletComponents(context).application
  }
}
