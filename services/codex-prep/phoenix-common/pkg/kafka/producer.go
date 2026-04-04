package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"go.uber.org/zap"
)

// ProducerConfig holds configuration for the Kafka producer.
type ProducerConfig struct {
	Logger      *zap.Logger
	Timeout     int // milliseconds
	Compression string
}

// Producer wraps a Kafka producer with error handling and convenience methods.
type Producer struct {
	producer *kafka.Producer
	logger   *zap.Logger
}

// NewProducer creates a new Kafka producer instance.
// brokers should be a comma-separated list of broker addresses (e.g., "localhost:9092").
func NewProducer(brokers string, config *ProducerConfig) (*Producer, error) {
	if config == nil {
		config = &ProducerConfig{}
	}

	if config.Logger == nil {
		config.Logger = zap.NewNop()
	}

	if config.Timeout == 0 {
		config.Timeout = 10000
	}

	if config.Compression == "" {
		config.Compression = "snappy"
	}

	kafkaConfig := kafka.ConfigMap{
		"bootstrap.servers": brokers,
		"client.id":         "phoenix-producer",
		"acks":              "all",
		"retries":           10,
		"retry.backoff.ms":  100,
		"linger.ms":         10,
		"compression.type":  config.Compression,
		"message.timeout.ms": config.Timeout,
	}

	producer, err := kafka.NewProducer(&kafkaConfig)
	if err != nil {
		config.Logger.Error("failed to create Kafka producer", zap.Error(err))
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	return &Producer{
		producer: producer,
		logger:   config.Logger,
	}, nil
}

// Publish sends a message to the specified topic with a key and value.
// Returns an error if the publish fails immediately; delivery errors are logged.
func (p *Producer) Publish(ctx context.Context, topic string, key, value []byte) error {
	msg := &kafka.Message{
		TopicPartition: kafka.TopicPartition{
			Topic:     &topic,
			Partition: kafka.PartitionAny,
		},
		Key:   key,
		Value: value,
	}

	deliveryChan := make(chan kafka.Event, 1)
	err := p.producer.Produce(msg, deliveryChan)
	if err != nil {
		p.logger.Error("failed to produce message", zap.String("topic", topic), zap.Error(err))
		return fmt.Errorf("failed to produce message to topic %s: %w", topic, err)
	}

	// Non-blocking delivery report collection
	select {
	case e := <-deliveryChan:
		m := e.(*kafka.Message)
		if m.TopicPartition.Error != nil {
			p.logger.Error("delivery failed", zap.String("topic", topic),
				zap.Error(m.TopicPartition.Error))
			return fmt.Errorf("delivery failed for topic %s: %w", topic, m.TopicPartition.Error)
		}
		p.logger.Debug("message delivered", zap.String("topic", topic),
			zap.Int32("partition", m.TopicPartition.Partition),
			zap.Int64("offset", int64(m.TopicPartition.Offset)))
	case <-ctx.Done():
		return fmt.Errorf("context cancelled before delivery confirmation: %w", ctx.Err())
	}

	return nil
}

// PublishJSON marshals the value to JSON and publishes it to the topic.
// The key is used as the Kafka message key.
func (p *Producer) PublishJSON(ctx context.Context, topic, key string, value any) error {
	jsonValue, err := json.Marshal(value)
	if err != nil {
		p.logger.Error("failed to marshal value to JSON", zap.Error(err))
		return fmt.Errorf("failed to marshal value to JSON: %w", err)
	}

	return p.Publish(ctx, topic, []byte(key), jsonValue)
}

// Flush waits for all pending messages to be delivered.
// Returns the number of messages still in queue after the timeout.
func (p *Producer) Flush(timeoutMs int) int {
	remaining := p.producer.Flush(timeoutMs)
	if remaining > 0 {
		p.logger.Warn("messages still in queue after flush timeout",
			zap.Int("remaining", remaining))
	}
	return remaining
}

// Close closes the producer and releases all resources.
// It will flush any pending messages before closing.
func (p *Producer) Close() error {
	p.logger.Info("closing Kafka producer")
	p.Flush(30000) // 30 second timeout

	p.producer.Close()
	return nil
}

// Metrics returns the internal statistics of the producer.
func (p *Producer) Metrics() (string, error) {
	stats, err := p.producer.GetMetadata(nil, false, 5000)
	if err != nil {
		return "", fmt.Errorf("failed to get producer metrics: %w", err)
	}
	return fmt.Sprintf("brokers=%d topics=%d", len(stats.Brokers), len(stats.Topics)), nil
}
