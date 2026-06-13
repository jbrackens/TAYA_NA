package service

import (
	"encoding/json"
	"sync"
)

type Broadcaster interface {
	SubscribeAchievements(userID string) (<-chan []byte, func())
	SubscribeLeaderboard() (<-chan []byte, func())
	PublishAchievement(userID string, message any)
	PublishLeaderboard(message any)
}

type memoryBroadcaster struct {
	mu               sync.RWMutex
	achievementsSubs map[string]map[chan []byte]struct{}
	leaderboardSubs  map[chan []byte]struct{}
}

func NewBroadcaster() Broadcaster {
	return &memoryBroadcaster{achievementsSubs: map[string]map[chan []byte]struct{}{}, leaderboardSubs: map[chan []byte]struct{}{}}
}

func (b *memoryBroadcaster) SubscribeAchievements(userID string) (<-chan []byte, func()) {
	ch := make(chan []byte, 8)
	b.mu.Lock()
	if _, ok := b.achievementsSubs[userID]; !ok { b.achievementsSubs[userID] = map[chan []byte]struct{}{} }
	b.achievementsSubs[userID][ch] = struct{}{}
	b.mu.Unlock()
	return ch, func() { b.mu.Lock(); delete(b.achievementsSubs[userID], ch); close(ch); b.mu.Unlock() }
}

func (b *memoryBroadcaster) SubscribeLeaderboard() (<-chan []byte, func()) {
	ch := make(chan []byte, 8)
	b.mu.Lock(); b.leaderboardSubs[ch] = struct{}{}; b.mu.Unlock()
	return ch, func() { b.mu.Lock(); delete(b.leaderboardSubs, ch); close(ch); b.mu.Unlock() }
}

func (b *memoryBroadcaster) PublishAchievement(userID string, message any) {
	body, _ := json.Marshal(message)
	b.mu.RLock(); subs := b.achievementsSubs[userID]; b.mu.RUnlock()
	for ch := range subs { select { case ch <- body: default: } }
}

func (b *memoryBroadcaster) PublishLeaderboard(message any) {
	body, _ := json.Marshal(message)
	b.mu.RLock(); defer b.mu.RUnlock()
	for ch := range b.leaderboardSubs { select { case ch <- body: default: } }
}
