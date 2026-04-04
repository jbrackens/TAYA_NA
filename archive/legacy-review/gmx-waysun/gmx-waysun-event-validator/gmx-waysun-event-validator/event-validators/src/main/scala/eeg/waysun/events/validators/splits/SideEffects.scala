package eeg.waysun.events.validators.splits

import eeg.waysun.events.validators.{Implicits, Types}
import org.apache.flink.streaming.api.scala.OutputTag

object SideEffects {

  val failed =
    OutputTag[Types.ValidationFailed.Source]("eeg-streaming.events-failed-side-effect")(
      Implicits.ValidationFailedImplicit.keyWithValue)

  val succeed =
    OutputTag[Types.Validated.Source]("eeg-streaming.events-succeed-side-effect")(
      Implicits.ValidatedImplicit.keyWithValue)

}
