package net.flipsports.gmx.widget.argyll.betandwatch.events.model

trait EventMappingDisplay {

  val displayMappings: PartialFunction[EventMapping, String] = {
    case EventMapping(event, provider, _, Some(stream)) =>
      s"Streaming for SBT ${display(event)} provided by $provider <-> matched ${display(stream)}"
    case EventMapping(event, provider, _, None) =>
      s"Streaming for SBT ${display(event)} provided by $provider <-> NOT matched"
  }

  def display(event: PageEvent): String = s"Game(id=${event.id}, sport=${event.sportType}, location=${event.league}, time=${event.startTime}, name=${event.title})"

  def display(stream: ProviderEvent): String = s"Event(id=${stream.id}, location=${stream.location}, time=${stream.startTime}, name=${stream.description})"

}
