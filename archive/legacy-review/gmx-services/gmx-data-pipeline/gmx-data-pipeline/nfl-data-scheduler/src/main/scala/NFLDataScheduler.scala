import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit

import akka.actor.{Actor, ActorLogging, ActorRef, ActorSystem, Props}
import com.cronutils.model.definition.CronDefinitionBuilder
import com.cronutils.model.time.ExecutionTime
import com.cronutils.parser.CronParser
import com.cronutils.model.CronType.QUARTZ
import scalaj.http.Http

import scala.concurrent.duration.FiniteDuration


case object CollectData
case class DeliverData(data: String)

trait DataCollectionSchedule{
  val execTime: ExecutionTime = ExecutionTime.forCron(
    new CronParser(
      CronDefinitionBuilder.instanceDefinitionFor(QUARTZ)
    ).parse("*/15 * * ? * *")
  )

  def timeTillNextCollection = execTime.timeToNextExecution(ZonedDateTime.now())
}

class NFLDataCollector(sender: ActorRef, week: String) extends Actor with ActorLogging with DataCollectionSchedule {
  def retrieve(): String = {
    Http("http://www.nfl.com/ajax/scorestrip")
      .param("season", "2018")
      .param("seasonType", "REG")
      .param("week", week)
      .asString
      .body
  }

  def receive = {
    case CollectData =>
      sender ! DeliverData(retrieve())
    case _ => println("Ping got something unexpected.")
  }
}

class NFLDataDispatcher extends Actor with ActorLogging with DataCollectionSchedule {
  import context._

  def props: Props = Props[NFLDataDispatcher]

  def send(data: String): Unit = {
    println(data)
  }

  def receive = {
    case DeliverData(data) =>
      send(data)

      context.system.scheduler.scheduleOnce(
        FiniteDuration(timeTillNextCollection.get().toNanos, TimeUnit.NANOSECONDS),
        sender,
        CollectData
      )
    case _ => println("Pong got something unexpected.")
  }
}

object NFLDataScheduler extends App {
  val system: ActorSystem = ActorSystem("data_scheduler")
  val nflDispatcher = system.actorOf(Props[NFLDataDispatcher], name = "nfl_data_dispatcher")

  def startCollectors(i: Int = 1): Unit = {
    if(i >  17) {}
    else {
      val nflCollector = system.actorOf(
        Props(new NFLDataCollector(nflDispatcher, i.toString)), name = s"nfl_data_collector_week_$i"
      )

      nflCollector ! CollectData
      startCollectors(i + 1)
    }
  }

  startCollectors()
}