package gmx.widget.siteextentions.datafeed.service.persistence

import java.sql.Timestamp
import java.time.Instant

import tech.argyll.video.domain.model.BaseModel

package object patching {
  def fillTimestamps[T <: BaseModel](model: T): T = {
    val now = new Timestamp(Instant.now().toEpochMilli)
    model.setCreatedAt(now)
    model.setUpdatedAt(now)
    model.setVersion(now)

    model
  }
}
