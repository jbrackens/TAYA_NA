package net.flipsports.gmx.streaming.idefix


object Types {

  object Event {
    import com.idefix.events.{Event, EventId}
    type SourceKey = java.lang.String
    type SourceValue = Event

    type TargetKey = EventId
    type TargetValue = Event
  }

}