package net.flipsports.gmx.streaming.tests.containers;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.Base58;

public class JSchemaRegistryContainer extends GenericContainer<JSchemaRegistryContainer> {

    private KafkaContainer kafkaContainer;
    private final int REGISTRY_PORT = 8081;
    private final int BROKER_PORT = 9092;
    private final String registryNetworkName = String.format("registry-%s", Base58.randomString(6));

    public JSchemaRegistryContainer(KafkaContainer kafkaContainer, Network network) {
        this("5.4.3", kafkaContainer, network);
    }

    public JSchemaRegistryContainer(String confluentPlatformVersion, KafkaContainer kafkaContainer, Network network) {
        super("confluentinc/cp-schema-registry" + ":" + confluentPlatformVersion);
        this.kafkaContainer = kafkaContainer;
        dependsOn(kafkaContainer);
        withNetwork(network);
        withExposedPorts(getRegistryInternalPort());
        Integer port = BROKER_PORT;
        withNetworkAliases(registryNetworkName);
        withEnv("SCHEMA_REGISTRY_HOST_NAME", registryNetworkName);
        withEnv("SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS", String.format("%s:%d", kafkaBrokerNetworkAlias(), port));
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
        return kafkaContainer.getEnvMap().get(ConfluentPlatformContainers.kafkaHostName());
    }


    public int getRegistryInternalPort() {
        return this.REGISTRY_PORT;
    }

    public int getRegistryPort() {
        return this.getMappedPort(this.REGISTRY_PORT);
    }
}
