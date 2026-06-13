package phoenix.oddin.infrastructure.xml

import phoenix.core.XmlUtils._
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.fixtureChange.FixtureChange
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.sportEventIdReader

object FixtureChangeXmlReaders {

  implicit val fixtureChangeReader: XmlNodeReader[FixtureChange] =
    node => node.readAttribute[OddinSportEventId].map(FixtureChange)
}
