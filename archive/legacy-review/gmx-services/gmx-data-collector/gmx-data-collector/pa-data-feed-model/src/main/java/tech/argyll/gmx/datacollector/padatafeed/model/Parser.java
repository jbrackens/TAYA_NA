package tech.argyll.gmx.datacollector.padatafeed.model;

import java.io.InputStream;
import java.util.List;

public interface Parser {

  <M> List<M> parse(InputStream input, Class<M> searchFor);
}
