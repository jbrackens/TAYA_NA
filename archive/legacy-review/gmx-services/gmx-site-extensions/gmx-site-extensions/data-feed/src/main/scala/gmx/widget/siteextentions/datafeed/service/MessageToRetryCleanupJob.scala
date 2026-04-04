package gmx.widget.siteextentions.datafeed.service

import scala.concurrent.duration.FiniteDuration
import scala.util.control.NonFatal

import com.typesafe.scalalogging.LazyLogging
import org.quartz.DisallowConcurrentExecution
import org.quartz.Job
import org.quartz.JobExecutionContext
import org.slf4j.MDC
import tech.argyll.video.common.UUID

import gmx.widget.siteextentions.datafeed.service.persistence.MessageToRetryService

@DisallowConcurrentExecution
class MessageToRetryCleanupJob(messageToRetryService: MessageToRetryService, retriedEarlierThan: FiniteDuration)
    extends Job
    with LazyLogging {
  private val partnerType = messageToRetryService.partnerType

  override def execute(context: JobExecutionContext): Unit = {
    val executionId = UUID.uuid
    MDC.put("executionId", executionId)
    try {
      logger.info("START cleanup job for partner {}", partnerType)
      messageToRetryService.deleteProcessedAndAbandonedMessages(retriedEarlierThan)
      logger.info("END job for partner {}", partnerType)
    } catch {
      case NonFatal(e) =>
        logger.error(s"Cleanup job for partner $partnerType finished with error", e)
    } finally MDC.remove("executionId")
  }
}
