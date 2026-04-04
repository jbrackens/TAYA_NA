package net.flipsports.gmx.streaming.sbtech

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.typeutils.TypeExtractor

object SideEffectsImplicits {

  object Events {

    import net.flipsports.gmx.streaming.sbtech.SideEffectsTypes.Events._

    implicit val keyWithValue: TypeInformation[Source] = TypeExtractor.getForClass(classOf[Source])
  }

  object Markets {

    import net.flipsports.gmx.streaming.sbtech.SideEffectsTypes.Markets._

    implicit val keyWithValue: TypeInformation[Source] = TypeExtractor.getForClass(classOf[Source])
  }

  object Selections {

    import net.flipsports.gmx.streaming.sbtech.SideEffectsTypes.Selections._

    implicit val keyWithValue: TypeInformation[Source] = TypeExtractor.getForClass(classOf[Source])
  }
}
