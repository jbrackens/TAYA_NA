package phoenix.oddin.infrastructure.xml

import phoenix.core.XmlUtils._
import phoenix.oddin.domain.OddinTournamentId
import phoenix.oddin.domain.tournamentChange.TournamentChange
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.tournamentIdReader

object TournamentChangeXmlReaders {

  implicit val tournamentChangeReader: XmlNodeReader[TournamentChange] =
    node => node.readAttribute[OddinTournamentId].map(TournamentChange)
}
