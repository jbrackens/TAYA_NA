# Demo data consumer

This application is purely for demo purposes only. 

More details are available in the .pdf file.

## Run me

The maven exec plugin is part-configured. To authenticate against a kafka broker you'll need to provide the truststore and keystore locations and the key, keystore, and truststore passwords.

```
mvn exec:java -Dssl.keystore.location=/var/private/ssl/kafka.flip.server.keystore.jks -Dssl.truststore.location=/var/private/ssl/kafka.flip.server.truststore.jks -Dssl.truststore.password=<HIDDEN> -Dssl.key.password=<HIDDEN> -Dssl.keystore.password=<HIDDEN> -Dbootstrap.servers=localhost:9093
```

Take a look on the running server at `/etc/supervisor/conf.d/demo.conf` for an example of how it's configured (and to see the passwords).