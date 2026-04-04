package tech.argyll.prices;

import io.ebean.Ebean;
import io.ebean.EbeanServer;
import org.apache.camel.main.Main;

/**
 * A Camel Application
 */
public class MainApp {

    /**
     * A main() so we can easily run these routing rules in our IDE
     */
    public static void main(String... args) throws Exception {
        EbeanServer server = Ebean.getDefaultServer();
        
        Main main = new Main();
        main.addRouteBuilder(new MyRouteBuilder());
        main.run(args);
    }
}

