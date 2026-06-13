package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	ckafka "github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

type Producer struct {
	producer *ckafka.Producer
}

type Consumer struct {
	consumer *ckafka.Consumer
}

type Message struct {
	Key   string
	Value []byte
	Topic string
}

func NewProducer(brokers []string) (*Producer, error) {
	producer, err := ckafka.NewProducer(&ckafka.ConfigMap{
		"bootstrap.servers": strings.Join(brokers, ","),
		"acks":              "all",
		"retries":           3,
	})
	if err != nil {
		return nil, fmt.Errorf("create kafka producer: %w", err)
	}
	return &Producer{producer: producer}, nil
}

func NewConsumer(brokers []string, groupID string, topics []string) (*Consumer, error) {
	consumer, err := ckafka.NewConsumer(&ckafka.ConfigMap{
		"bootstrap.servers": strings.Join(brokers, ","),
		"group.id":          groupID,
		"auto.offset.reset": "earliest",
	})
	if err != nil {
		return nil, fmt.Errorf("create kafka consumer: %w", err)
	}
	if err := consumer.SubscribeTopics(topics, nil); err != nil {
		return nil, fmt.Errorf("subscribe topics: %w", err)
	}
	return &Consumer{consumer: consumer}, nil
}

func (p *Producer) SendMessage(ctx context.Context, topic, key string, value any) error {
	if p == nil || p.producer == nil {
		return nil
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal kafka message: %w", err)
	}
	delivery := make(chan ckafka.Event, 1)
	if err := p.producer.Produce(&ckafka.Message{TopicPartition: ckafka.TopicPartition{Topic: &topic, Partition: ckafka.PartitionAny}, Key: []byte(key), Value: payload}, delivery); err != nil {
		return fmt.Errorf("produce message: %w", err)
	}
	select {
	case event := <-delivery:
		message := event.(*ckafka.Message)
		if message.TopicPartition.Error != nil {
			return fmt.Errorf("delivery failed: %w", message.TopicPartition.Error)
		}
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (p *Producer) Close() {
	if p != nil && p.producer != nil {
		p.producer.Close()
	}
}

func (c *Consumer) ReadMessage(timeout time.Duration) (*Message, error) {
	if c == nil || c.consumer == nil {
		return nil, fmt.Errorf("consumer not initialized")
	}
	msg, err := c.consumer.ReadMessage(timeout)
	if err != nil {
		return nil, err
	}
	return &Message{Key: string(msg.Key), Value: msg.Value, Topic: *msg.TopicPartition.Topic}, nil
}

func (c *Consumer) Close() {
	if c != nil && c.consumer != nil {
		c.consumer.Close()
	}
}

func (m *Message) UnmarshalJSON(v any) error {
	return json.Unmarshal(m.Value, v)
}
