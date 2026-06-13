package phoenix.punters.exclusion.infrastructure

import java.nio.file.Path

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.core.ftp.SftpClient
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.ExcludedPlayersFeed

final class SftpExcludedPlayersFeed(sftp: SftpClient, ingestionFile: Path) extends ExcludedPlayersFeed {

  override def getExcludedPlayers(): Source[ExcludedPlayer, NotUsed] = {
    val ingestionSource = sftp.read(ingestionFile)
    ExclusionFileParser.parse(ingestionSource).mapMaterializedValue(_ => NotUsed)
  }
}
