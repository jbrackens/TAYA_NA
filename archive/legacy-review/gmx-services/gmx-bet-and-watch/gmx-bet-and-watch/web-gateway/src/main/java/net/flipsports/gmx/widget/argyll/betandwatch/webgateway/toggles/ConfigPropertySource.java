package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.toggles;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.togglz.core.logging.Log;
import org.togglz.core.logging.LogFactory;
import org.togglz.core.repository.property.PropertySource;

import java.util.Collections;
import java.util.Map.Entry;
import java.util.Set;
import java.util.stream.Collectors;

class ConfigPropertySource implements PropertySource {

  private static final Log log = LogFactory.getLog(ConfigPropertySource.class);

//  private final File file;
//
//  private final int minCheckInterval;

  private Config config = ConfigFactory.load();

//  private long lastRead = 0;
//
//  private long lastCheck = 0;
//
//  public ConfigPropertySource(File file) {
//    this(file, 1000);
//  }
//
//  public ConfigPropertySource(File file, int minCheckInterval) {
//    this.file = file;
//    this.minCheckInterval = minCheckInterval;
//  }

  public synchronized void reloadIfUpdated() {
//
//    long now = System.currentTimeMillis();
//    if (now - lastCheck > minCheckInterval) {
//
//      lastCheck = now;
//
//      if (file.lastModified() > lastRead) {
//        try {
//          // read new config
//          config = ConfigFactory.load();
//          lastRead = System.currentTimeMillis();
//
//          log.info("Reloaded file: " + file.getCanonicalPath());
//
//        } catch (FileNotFoundException e) {
//          log.debug("File not found: " + file);
//        } catch (IOException e) {
//          log.error("Failed to read file", e);
//        }
//      }
//    }
  }

  public String getValue(String key, String defaultValue) {
    if (config.hasPath(key)) {
      return config.getString(key);
    } else {
      return defaultValue;
    }
  }

  public Set<String> getKeysStartingWith(String prefix) {
    if (prefix.endsWith(".")) {
      prefix = prefix.substring(0, prefix.length() - 2);
    }


    if (!config.hasPath(prefix)) {
      return Collections.emptySet();
    }

    Config keys = config.getConfig(prefix);

    return keys.entrySet().stream()
        .map(Entry::getKey)
        .collect(Collectors.toSet());

  }

  public PropertySource.Editor getEditor() {
    throw new UnsupportedOperationException("ConfigPropertySource is read-only");
  }
}
