package eeg.waysun.events.aggregation.data.generators

trait Generator[A] {
  def single(implicit index: Int): A
  final def all(N: Int): Seq[A] = (0 to N).map(single(_))
}
