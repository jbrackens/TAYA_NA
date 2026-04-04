package tech.argyll.gmx.predictorgame.common.play.api

import javax.inject.Provider
import play.api._
import play.api.http.DefaultHttpErrorHandler
import play.api.mvc.Results._
import play.api.mvc._
import play.api.routing.Router

import scala.concurrent._

class ErrorHandler(env: Environment,
                   config: Configuration,
                   sourceMapper: OptionalSourceMapper,
                   router: Provider[Router])
    extends DefaultHttpErrorHandler(env, config, sourceMapper, router)
    with ResponseOps {

  override def onDevServerError(request: RequestHeader,
                                exception: UsefulException): Future[Result] =
    handleError(request, exception)

  override def onProdServerError(request: RequestHeader,
                                 exception: UsefulException): Future[Result] =
    handleError(request, exception)

  private def handleError(request: RequestHeader,
                          exception: UsefulException): Future[Result] =
    Future.successful(
      InternalServerError(fault(ApiError("unexpected", exception.getMessage)))
    )
}
