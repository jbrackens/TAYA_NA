package gmx.widget.siteextentions.datafeed.service.persistence

import scala.compat.java8.OptionConverters._

import com.typesafe.scalalogging.LazyLogging
import io.ebean.Finder
import tech.argyll.video.domain.model.MessageLog
import tech.argyll.video.domain.model.MessageType
import tech.argyll.video.domain.model.PartnerType

class MessageLogDao extends LazyLogging {

  import MessageLogDao.finder

  def find(partnerType: PartnerType, messageType: MessageType, refId: String): Option[MessageLog] =
    finder
      .query()
      .where()
      .eq("partnerType", partnerType)
      .eq("messageType", messageType)
      .eq("refId", refId)
      .findOneOrEmpty()
      .asScala
}

object MessageLogDao {
  val finder = new Finder[String, MessageLog](classOf[MessageLog])
}
