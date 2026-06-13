package actors;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import javax.inject.Inject;

import org.apache.commons.lang3.ArrayUtils;

import akka.actor.AbstractActor;
import akka.japi.pf.ReceiveBuilder;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;

public class Sender extends AbstractActor {
	
	final static String[] BANNED_HEADERS = new String[]{"Content-Length"};
	
	final WSClient ws;

	@Inject
	public Sender(WSClient ws) {
		this.ws = ws;
		
		receive(ReceiveBuilder.
			match(OptaMessage.class, m -> {
				send(m);
			}).
			matchAny(o -> Logger.info("{} - received unknown message {}", self(), o)).build()
		);
	}
	
	void send(OptaMessage m) {
		WSRequest request = ws.url(m.url);
		
		m.data.headers.forEach((key, values) -> {
			if (!ArrayUtils.contains(BANNED_HEADERS, key)) {
				for (String value : values) {
					request.setHeader(key, value);
				}
			}
		});
		
		int contentLength = m.data.data.length();
		
		request.setHeader("Content-Length", String.valueOf(contentLength));
		
		CompletionStage<WSResponse> responsePromise = request.post(m.data.data);
		responsePromise.handle((result, error) -> {
		    if (error != null) {
		    	Logger.error("Error sending to '{}'", m.url);
		    	Logger.error("Error", error);
		    } else {
		    	if (result.getStatus() != 200) {
		    		Logger.error("Failed {} - {}", result.getStatus(), result.getBody());
		    	} else {
		    		Logger.info("{} chars forwarded to {}", contentLength, m.url);
		    	}
		    }
		    
		    return CompletableFuture.completedFuture(result);
		});
	}
}
