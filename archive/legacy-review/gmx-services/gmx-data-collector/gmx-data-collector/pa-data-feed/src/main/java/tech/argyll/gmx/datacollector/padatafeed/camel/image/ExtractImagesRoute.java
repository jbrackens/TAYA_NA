package tech.argyll.gmx.datacollector.padatafeed.camel.image;

import static org.apache.camel.LoggingLevel.DEBUG;

import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Endpoint;
import org.apache.camel.Processor;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.dataformat.tarfile.TarSplitter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ExtractImagesRoute extends RouteBuilder {

  public static final String ROUTE_ID = "ExtractImagesRoute";
  public static final String ENTRY_URI = "direct:ExtractImagesRoute";

  public static final String ENDPOINT_ID = "storeImageEndpoint";

  private final ImagePathHeaderProcessor imagePathHeaderProcessor;
  private final Processor imageStorageProcessorGroup;
  private final Endpoint storeImageEndpoint;

  public ExtractImagesRoute(ImagePathHeaderProcessor imagePathHeaderProcessor,
      @Qualifier("imageStorageProcessorGroup") Processor imageStorageProcessorGroup,
      @Qualifier("storeImageEndpoint") Endpoint storeImageEndpoint) {
    this.imagePathHeaderProcessor = imagePathHeaderProcessor;
    this.imageStorageProcessorGroup = imageStorageProcessorGroup;
    this.storeImageEndpoint = storeImageEndpoint;
  }

  public void configure() {
    // @formatter:off
    from(ENTRY_URI)
        .routeId(ROUTE_ID)
        .process(imagePathHeaderProcessor)
        .unmarshal()
        .gzip()
        .split(new TarSplitter())
          .streaming()
          .filter(body().isNotNull())
          .log(DEBUG, log.getName(), "### Extracting file: ${file:name}.")
          .process(imageStorageProcessorGroup)
          .to(storeImageEndpoint).id(ENDPOINT_ID)
        .end();
    // @formatter:on
  }
}
