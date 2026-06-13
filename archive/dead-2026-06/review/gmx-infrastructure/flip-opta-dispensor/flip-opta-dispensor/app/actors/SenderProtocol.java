package actors;

import akka.actor.Actor;

public class SenderProtocol {

	public interface Factory {
		public Actor create();
	}
}
