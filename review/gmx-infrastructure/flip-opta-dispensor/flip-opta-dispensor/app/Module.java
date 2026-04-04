import java.time.Clock;

import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.lambdaworks.redis.RedisClient;
import com.lambdaworks.redis.api.StatefulRedisConnection;
import com.lambdaworks.redis.api.sync.RedisCommands;

import actors.Dispensor;
import actors.Sender;
import actors.SenderProtocol;
import play.Configuration;
import play.libs.akka.AkkaGuiceSupport;
import services.ApplicationTimer;
import services.AtomicCounter;
import services.Counter;

/**
 * This class is a Guice module that tells Guice how to bind several
 * different types. This Guice module is created when the Play
 * application starts.
 *
 * Play will automatically use any class called `Module` that is in
 * the root package. You can create modules in other locations by
 * adding `play.modules.enabled` settings to the `application.conf`
 * configuration file.
 */
public class Module extends AbstractModule implements AkkaGuiceSupport {

    @Override
    public void configure() {
        // Use the system clock as the default implementation of Clock
        bind(Clock.class).toInstance(Clock.systemDefaultZone());
        // Ask Guice to create an instance of ApplicationTimer when the
        // application starts.
        bind(ApplicationTimer.class).asEagerSingleton();
        // Set AtomicCounter as the implementation for Counter.
        bind(Counter.class).to(AtomicCounter.class);
        
        bindActor(Dispensor.class, "opta-dispensor");
        bindActorFactory(Sender.class, SenderProtocol.Factory.class);
    }
    
    @Provides
	@Singleton
	RedisCommands<String, String> redisConnection(Configuration conf) throws Exception {
    	String url = conf.getString("redis.url", "redis://localhost:6379");
    	RedisClient client = RedisClient.create(url);
		StatefulRedisConnection<String, String> connection = client.connect();
		return connection.sync();
	}

}
