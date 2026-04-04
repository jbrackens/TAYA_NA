package controllers;

import java.nio.charset.Charset;

import javax.inject.Inject;

import com.google.inject.name.Named;

import actors.RequestData;
import akka.actor.ActorRef;
import play.Logger;
import play.libs.XML;
import play.mvc.BodyParser;
import play.mvc.Controller;
import play.mvc.Result;

public class OptaController extends Controller {
	
	@Inject @Named("opta-dispensor")
	ActorRef dispensor;

	public Result receive() {
		Logger.info("received data");
		RequestData rd = new RequestData();
		rd.data = request().body().asBytes().decodeString("utf-8");
		rd.headers = request().headers();
		dispensor.tell(rd, null);
		return ok();
	}
	
//	@BodyParser.Of(BodyParser.Xml.class)
	public Result dummy() {
		Logger.info("received dummy");
		return ok();
	}
}
