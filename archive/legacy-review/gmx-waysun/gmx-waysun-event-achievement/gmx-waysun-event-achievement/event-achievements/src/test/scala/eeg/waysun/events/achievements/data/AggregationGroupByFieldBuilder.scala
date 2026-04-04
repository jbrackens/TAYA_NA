package eeg.waysun.events.achievements.data

import com.github.javafaker.Faker

case class AggregationGroupByFieldBuilder(
    faker: Faker = Faker.instance(),
    name: String = Faker.instance().name().toString.toLowerCase) {

  def groupBy(): String = s"group-by-field-$name"

  def next(): AggregationGroupByFieldBuilder = this.copy(faker, name = faker.name().toString.toLowerCase)
}
