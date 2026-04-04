package gmx.widget.siteextentions.datafeed.service.persistence

import java.time.ZoneOffset
import java.time.ZonedDateTime

import scala.concurrent.duration.FiniteDuration
import scala.jdk.CollectionConverters.asScalaBufferConverter

import com.typesafe.scalalogging.LazyLogging
import io.ebean.Finder
import tech.argyll.video.domain.model.MessageToRetry
import tech.argyll.video.domain.model.MessageToRetryStatus
import tech.argyll.video.domain.model.MessageType
import tech.argyll.video.domain.model.PartnerType

class MessageToRetryDao extends LazyLogging {

  import MessageToRetryDao.finder

  def findMessagesToRetry(
      partnerType: PartnerType,
      messageType: MessageType,
      maxTime: ZonedDateTime,
      maxNumberOfResults: Int): List[MessageToRetry] =
    finder
      .query()
      .where()
      .eq("partnerType", partnerType)
      .eq("messageType", messageType)
      .eq("status", MessageToRetryStatus.TO_DO)
      .le("nextRetryDate", maxTime)
      .orderBy("nextRetryDate asc")
      .setMaxRows(maxNumberOfResults)
      .findList()
      .asScala
      .toList

  def deleteProcessedAndAbandonedMessages(partnerType: PartnerType, retriedEarlierThan: FiniteDuration): Unit = {
    val earlierThan = ZonedDateTime.now(ZoneOffset.UTC).minusNanos(retriedEarlierThan.toNanos)
    val deletedEntries = finder
      .query()
      .where()
      .eq("partnerType", partnerType)
      .ne("status", MessageToRetryStatus.TO_DO)
      .lt("nextRetryDate", earlierThan)
      .delete()
    logger.info("Cleaned up {} messages for partner {} partnerType", deletedEntries, partnerType)
  }
}

object MessageToRetryDao {
  val finder = new Finder[String, MessageToRetry](classOf[MessageToRetry])
}
