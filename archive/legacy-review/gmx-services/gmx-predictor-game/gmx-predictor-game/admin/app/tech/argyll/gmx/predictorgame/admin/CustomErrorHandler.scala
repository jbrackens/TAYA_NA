package tech.argyll.gmx.predictorgame.admin

import javax.inject.{Inject, Provider, Singleton}
import play.api.routing.Router
import play.api.{Configuration, Environment, OptionalSourceMapper}
import tech.argyll.gmx.predictorgame.common.play.api.ErrorHandler

@Singleton
class CustomErrorHandler @Inject()(env: Environment,
                                   config: Configuration,
                                   sourceMapper: OptionalSourceMapper,
                                   router: Provider[Router])
  extends ErrorHandler(env, config, sourceMapper, router) {

}