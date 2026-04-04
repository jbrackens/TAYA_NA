package eeg.waysun.events.validators.streams.dto

import eeg.waysun.events.validators.Types

case class Streams(raw: Types.Stream.RawDataStream, definition: Types.Stream.DefinitionDataStream)
