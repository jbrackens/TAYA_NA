package actors;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import javax.inject.Inject;

import com.lambdaworks.redis.api.sync.RedisCommands;

import akka.actor.AbstractActor;
import akka.actor.ActorRef;
import akka.actor.Props;
import akka.event.Logging;
import akka.event.LoggingAdapter;
import akka.japi.pf.ReceiveBuilder;
import play.Logger;
import play.libs.akka.InjectedActorSupport;

public class Dispensor extends AbstractActor implements InjectedActorSupport {
	
	@Inject SenderProtocol.Factory childFactory;
	
	@Inject RedisCommands<String, String> redis;
	
	public Dispensor() {
		receive(ReceiveBuilder.
			match(RequestData.class, d -> {
				redis.lrange("opta.dispensor.urls", 0, -1).forEach(url -> {
					injectedChild(() -> childFactory.create(), "opta-sender-" + UUID.randomUUID().toString()).tell(new OptaMessage(url, d), self());
				});				
			}).
			matchAny(o -> Logger.info("{} received unknown event {}", self(), o)).
			build()
		);
	}
}
