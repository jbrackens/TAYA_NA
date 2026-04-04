package stella.leaderboard.ingestor.it.containers.kafka;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.Base58;

/**
 * Copied from gmx-streaming-data-engine. Eventually to be replaced by the dependency to some commons project
 */
public class JSchemaRegistryContainer extends GenericContainer<JSchemaRegistryContainer> {

    private KafkaContainer kafkaContainer;
    private final int REGISTRY_PORT = 8081;
    private final int BROKER_PORT = 9092;
    private final String registryNetworkName = String.format("registry-%s", Base58.randomString(6));

    public JSchemaRegistryContainer(KafkaContainer kafkaContainer) {
        this("5.3.1", kafkaContainer);
    }

    public JSchemaRegistryContainer(String confluentPlatformVersion, KafkaContainer kafkaContainer) {
        super("confluentinc/cp-schema-registry" + ":" + confluentPlatformVersion);
        this.kafkaContainer = kafkaContainer;
        withNetwork(kafkaContainer.getNetwork());
        dependsOn(kafkaContainer);
        withExposedPorts(getRegistryInternalPort());
        withNetworkAliases(registryNetworkName);
        withEnv("SCHEMA_REGISTRY_HOST_NAME", registryNetworkName);
        withEnv("SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS", String.format("PLAINTEXT://%s:%d", kafkaBrokerNetworkAlias(), BROKER_PORT));
        withEnv("SCHEMA_REGISTRY_LISTENERS", schemaRegistryInternalUrl());
        waitingFor(Wait.forHttp("/subjects").forPort(REGISTRY_PORT));
    }

    public String schemaRegistryInternalUrl() {
        return String.format("http://%s:%d", registryNetworkName, getRegistryInternalPort());
    }


    public String schemaRegistryUrl() {
        return String.format("http://%s:%d", getContainerIpAddress(), getRegistryPort());
    }


    private String kafkaBrokerNetworkAlias() {
        return kafkaContainer.getNetworkAliases().stream().filter(n -> n.startsWith("kafka")).findFirst().get();
    }


    public int getRegistryInternalPort() {
        return this.REGISTRY_PORT;
    }

    public int getRegistryPort() {
        return this.getMappedPort(this.REGISTRY_PORT);
    }
}
