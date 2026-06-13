package kafka

import (
	"context"
	"fmt"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"go.uber.org/zap"
)

// ConsumerConfig holds configuration for the Kafka consumer.
type ConsumerConfig struct {
	Logger               *zap.Logger
	GroupID              string
	SessionTimeoutMs     int
	MaxConcurrentHandles int
	PollTimeoutMs        int
}

// Consumer wraps a Kafka consumer with error handling and convenience methods.
type Consumer struct {
	consumer *kafka.Consumer
	logger   *zap.Logger
	config   *ConsumerConfig
}

// MessageHandler is a function that processes a Kafka message.
// It receives the topic, key, and value of the message.
// Returning an error will cause the message to not be committed.
type MessageHandler func(ctx context.Context, topic string, key, value []byte) error

// NewConsumer creates a new Kafka consumer instance.
// brokers should be a comma-separated list of broker addresses.
// groupID is the consumer group ID.
// topics is a slice of topics to subscribe to.
func NewConsumer(brokers string, groupID string, topics []string, config *ConsumerConfig) (*Consumer, error) {
	if config == nil {
		config = &ConsumerConfig{}
	}

	if config.Logger == nil {
		config.Logger = zap.NewNop()
	}

	if config.SessionTimeoutMs == 0 {
		config.SessionTimeoutMs = 30000
	}

	if config.MaxConcurrentHandles == 0 {
		config.MaxConcurrentHandles = 1
	}

	if config.PollTimeoutMs == 0 {
		config.PollTimeoutMs = 1000
	}

	kafkaConfig := kafka.ConfigMap{
		"bootstrap.servers":    brokers,
		"group.id":             groupID,
		"auto.offset.reset":    "earliest",
		"enable.auto.commit":   false,
		"session.timeout.ms":   config.SessionTimeoutMs,
		"max.poll.interval.ms": 300000,
		"client.id":            fmt.Sprintf("phoenix-consumer-%s", groupID),
	}

	consumer, err := kafka.NewConsumer(&kafkaConfig)
	if err != nil {
		config.Logger.Error("failed to create Kafka consumer", zap.Error(err))
		return nil, fmt.Errorf("failed to create Kafka consumer: %w", err)
	}

	err = consumer.SubscribeTopics(topics, nil)
	if err != nil {
		config.Logger.Error("failed to subscribe to topics", zap.Error(err))
		consumer.Close()
		return nil, fmt.Errorf("failed to subscribe to topics: %w", err)
	}

	config.Logger.Info("consumer subscribed to topics", zap.Strings("topics", topics), zap.String("group_id", groupID))

	return &Consumer{
		consumer: consumer,
		logger:   config.Logger,
		config:   config,
	}, nil
}

// Subscribe starts consuming messages and calls the handler for each message.
// This is a blocking call that will continue until the context is cancelled.
// Messages are committed after successful handler execution.
func (c *Consumer) Subscribe(ctx context.Context, handler MessageHandler) error {
	c.logger.Info("starting message consumption")

	ticker := time.NewTicker(time.Duration(c.config.PollTimeoutMs) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("consumer context cancelled, stopping")
			return ctx.Err()
		case <-ticker.C:
			msg, err := c.consumer.ReadMessage(time.Duration(c.config.PollTimeoutMs) * time.Millisecond)
			if err != nil {
				if err.(kafka.Error).Code() != kafka.ErrTimedOut {
					c.logger.Error("consumer error", zap.Error(err))
				}
				continue
			}

			// Process the message
			if err := handler(ctx, *msg.TopicPartition.Topic, msg.Key, msg.Value); err != nil {
				c.logger.Error("handler error",
					zap.String("topic", *msg.TopicPartition.Topic),
					zap.Error(err))
				// Don't commit on error
				continue
			}

			// Commit the message offset
			_, err = c.consumer.CommitMessage(msg)
			if err != nil {
				c.logger.Error("failed to commit message",
					zap.String("topic", *msg.TopicPartition.Topic),
					zap.Int64("offset", int64(msg.TopicPartition.Offset)),
					zap.Error(err))
			}
		}
	}
}

// CommitSync synchronously commits the current offset.
func (c *Consumer) CommitSync(ctx context.Context) error {
	_, err := c.consumer.Commit()
	if err != nil {
		c.logger.Error("failed to commit offset", zap.Error(err))
		return fmt.Errorf("failed to commit offset: %w", err)
	}
	return nil
}

// Assignments returns the current partition assignments for this consumer.
func (c *Consumer) Assignments() ([]kafka.TopicPartition, error) {
	partitions, err := c.consumer.Assignment()
	if err != nil {
		c.logger.Error("failed to get assignments", zap.Error(err))
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}
	return partitions, nil
}

// Close closes the consumer and releases all resources.
// It performs a graceful shutdown, committing any pending offsets.
func (c *Consumer) Close() error {
	c.logger.Info("closing Kafka consumer")

	// Attempt to commit any pending offsets
	_, err := c.consumer.Commit()
	if err != nil && err.(kafka.Error).Code() != kafka.ErrNoOffset {
		c.logger.Warn("failed to commit final offset", zap.Error(err))
	}

	err = c.consumer.Close()
	if err != nil {
		c.logger.Error("error closing consumer", zap.Error(err))
		return fmt.Errorf("error closing consumer: %w", err)
	}

	return nil
}

// Lag returns the consumer lag for a specific topic and partition.
func (c *Consumer) Lag(topic string, partition int32) (int64, error) {
	low, high, err := c.consumer.QueryWatermarkOffsets(topic, partition, 5000)
	if err != nil {
		c.logger.Error("failed to query watermark offsets", zap.Error(err))
		return 0, fmt.Errorf("failed to query watermark offsets: %w", err)
	}

	committed, err := c.consumer.Committed([]kafka.TopicPartition{
		{
			Topic:     &topic,
			Partition: partition,
		},
	}, 5000)
	if err != nil {
		c.logger.Error("failed to get committed offset", zap.Error(err))
		return 0, fmt.Errorf("failed to get committed offset: %w", err)
	}

	if len(committed) == 0 {
		return high - low, nil
	}

	currentOffset := committed[0].Offset
	if currentOffset < 0 {
		return high - low, nil
	}

	return high - int64(currentOffset), nil
}
