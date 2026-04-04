# Project with api for sbtech kafka.

##Structure:
* gmx-kafka-mirror
* gmx-sbtech-data-api


## gmx-kafka-mirror:
    Tool for mirroring kafka topics from sbtech kafka. 
### To build tool you need to have:
    - docker
#### Explanation:
    - config/consumer.properties => contains sbtech kafka properties for consuming data
     need to have client.truststore.jks and client.keystore.jks
    - config/producer.properties => contains flipsports kafka configuration for publishing data
    - config/source.txt => coma separated list of topic's which you want to mirror.
    
### building docker:
    - docker build . -name gmx-kafka-mirror
    
### running docker:  
    - docker run -v <YOUR-CONFIGURATION-DIR>:/config gmx-kafka-mirror
    

## gmx-sbtech-data-api
    Tool for generation java pojo from avro schema.

### To build tool you need:
    - sbt

### Generation and publishing in (projects root - gmx-sbtech-data):
    - sbt clean compile
    - sbt publish
     