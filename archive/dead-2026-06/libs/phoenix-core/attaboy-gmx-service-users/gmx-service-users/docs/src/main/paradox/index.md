# Lagom Microservice System

[Lagom](https://www.lagomframework.com/) is an open source framework (built on [Akka](https://akka.io/) and [Play](https://www.playframework.com/)) for developing reactive microservice systems in Java or Scala.

This Guide will show you how to setup a local development environment.

## Running the system

This system uses akka-persistence JDBC to store events in PostgresSQL databases (1 database per service).

This system also uses ELK+Grafana for collecting and storing metrics generated at runtime.

All of these services can be started and managed via Docker Compose.

```
cd docker
docker compose up
```

The first time you run the script it will take some time to resolve and download some dependencies. Once
ready you'll be able to access the Grafana dashboards at `http://localhost:3000`. You'll then be able to start the Lagom system.

```
sbt:hello> runAll
```

The `runAll` command starts Lagom in development mode. Once all the services are started you will see Lagom's start message:

```
...
[info] Service hello-proxy-impl listening for HTTP on 127.0.0.1:54328
[info] Service hello-proxy-impl listening for HTTPS on 127.0.0.1:65108
[info] Service hello-impl listening for HTTP on 127.0.0.1:65499
[info] Service hello-impl listening for HTTPS on 127.0.0.1:11000
[info] (Services started, press enter to stop and go back to the console...)
```

As soon as you see the message `[info] (Services started, press enter to stop and go back to the console...)` you
can proceed. On a separate terminal, try the application:

```bash
$ curl http://localhost:9000/proxy/rest-hello/Alice
Hi Alice!
$ curl http://localhost:9000/proxy/grpc-hello/Steve
Hi Steve! (gRPC)
```
