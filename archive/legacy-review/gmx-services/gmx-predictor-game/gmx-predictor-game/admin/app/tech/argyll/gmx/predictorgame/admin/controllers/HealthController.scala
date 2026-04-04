package tech.argyll.gmx.predictorgame.admin.controllers

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import play.api.mvc.InjectedController
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.ResponseOps

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class HealthController @Inject()(time: TimeService)
                                (implicit ec: ExecutionContext)
  extends InjectedController
    with ResponseOps {

  def check() = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)

    Action.async {
      Future {
        Ok(currentTime.toString)
      }
    }
  }
}
