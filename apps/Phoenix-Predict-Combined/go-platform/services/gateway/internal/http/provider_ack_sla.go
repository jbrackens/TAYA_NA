package http

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/provider"
	"phoenix-revival/platform/transport/httpx"
)

const (
	defaultProviderAcknowledgementSLAWarningMinutes  int64 = 15
	defaultProviderAcknowledgementSLACriticalMinutes int64 = 30

	providerAcknowledgementSLAWarningMinutesEnv  = "GATEWAY_PROVIDER_ACK_SLA_WARNING_MINUTES"
	providerAcknowledgementSLACriticalMinutesEnv = "GATEWAY_PROVIDER_ACK_SLA_CRITICAL_MINUTES"

	providerAcknowledgementSLADefaultUpdatedAction = "provider.stream.sla.default.updated"
	providerAcknowledgementSLAAdapterUpdatedAction = "provider.stream.sla.adapter.updated"
)

type providerAcknowledgementSLAUpdateRequest struct {
	Adapter         string `json:"adapter,omitempty"`
	WarningMinutes  int64  `json:"warningMinutes"`
	CriticalMinutes int64  `json:"criticalMinutes"`
}

type providerAcknowledgementSLASetting struct {
	Adapter         string `json:"adapter,omitempty"`
	WarningMinutes  int64  `json:"warningMinutes"`
	CriticalMinutes int64  `json:"criticalMinutes"`
	UpdatedAt       string `json:"updatedAt,omitempty"`
	UpdatedBy       string `json:"updatedBy,omitempty"`
	Source          string `json:"source,omitempty"`
}

type providerAcknowledgementSLASettingsView struct {
	Default   providerAcknowledgementSLASetting   `json:"default"`
	Overrides []providerAcknowledgementSLASetting `json:"overrides"`
	Effective []providerAcknowledgementSLASetting `json:"effective"`
}

func providerAcknowledgementSLADefaultFromEnv(getenv func(string) string) providerAcknowledgementSLASetting {
	warning := defaultProviderAcknowledgementSLAWarningMinutes
	critical := defaultProviderAcknowledgementSLACriticalMinutes
	if getenv != nil {
		if parsed := parseInt64OrFallback(getenv(providerAcknowledgementSLAWarningMinutesEnv), warning); parsed > 0 {
			warning = parsed
		}
		if parsed := parseInt64OrFallback(getenv(providerAcknowledgementSLACriticalMinutesEnv), critical); parsed > 0 {
			critical = parsed
		}
	}
	if critical <= warning {
		critical = warning + 1
	}
	return providerAcknowledgementSLASetting{
		WarningMinutes:  warning,
		CriticalMinutes: critical,
		Source:          "default",
	}
}

func providerAcknowledgementSLASettingsSnapshot(
	streams []provider.StreamStatus,
	acknowledgements []providerStreamAcknowledgementEntry,
) providerAcknowledgementSLASettingsView {
	defaultSetting := providerAcknowledgementSLADefaultFromEnv(os.Getenv)
	overrides := map[string]providerAcknowledgementSLASetting{}

	entries := providerOpsAuditSnapshot()
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].OccurredAt == entries[j].OccurredAt {
			return entries[i].ID < entries[j].ID
		}
		return entries[i].OccurredAt < entries[j].OccurredAt
	})

	for _, entry := range entries {
		setting, isDefault, err := providerAcknowledgementSLASettingFromAuditEntry(entry)
		if err != nil {
			continue
		}
		if isDefault {
			defaultSetting.WarningMinutes = setting.WarningMinutes
			defaultSetting.CriticalMinutes = setting.CriticalMinutes
			defaultSetting.UpdatedAt = setting.UpdatedAt
			defaultSetting.UpdatedBy = setting.UpdatedBy
			continue
		}
		if setting.Adapter == "" {
			continue
		}
		setting.Source = "override"
		overrides[setting.Adapter] = setting
	}
	defaultSetting.Source = "default"

	overrideList := make([]providerAcknowledgementSLASetting, 0, len(overrides))
	for _, setting := range overrides {
		overrideList = append(overrideList, setting)
	}
	sort.SliceStable(overrideList, func(i, j int) bool {
		return overrideList[i].Adapter < overrideList[j].Adapter
	})

	adapters := map[string]struct{}{}
	for _, stream := range streams {
		adapterName := strings.TrimSpace(stream.Adapter)
		if adapterName == "" {
			continue
		}
		adapters[adapterName] = struct{}{}
	}
	for _, acknowledgement := range acknowledgements {
		adapterName := strings.TrimSpace(acknowledgement.Adapter)
		if adapterName == "" {
			continue
		}
		adapters[adapterName] = struct{}{}
	}
	for adapterName := range overrides {
		adapters[adapterName] = struct{}{}
	}

	effectiveAdapters := make([]string, 0, len(adapters))
	for adapterName := range adapters {
		effectiveAdapters = append(effectiveAdapters, adapterName)
	}
	sort.Strings(effectiveAdapters)

	effective := make([]providerAcknowledgementSLASetting, 0, len(effectiveAdapters))
	for _, adapterName := range effectiveAdapters {
		if override, ok := overrides[adapterName]; ok {
			effective = append(effective, override)
			continue
		}
		effective = append(effective, providerAcknowledgementSLASetting{
			Adapter:         adapterName,
			WarningMinutes:  defaultSetting.WarningMinutes,
			CriticalMinutes: defaultSetting.CriticalMinutes,
			UpdatedAt:       defaultSetting.UpdatedAt,
			UpdatedBy:       defaultSetting.UpdatedBy,
			Source:          "default",
		})
	}

	return providerAcknowledgementSLASettingsView{
		Default:   defaultSetting,
		Overrides: overrideList,
		Effective: effective,
	}
}

func validateProviderAcknowledgementSLAUpdateRequest(request providerAcknowledgementSLAUpdateRequest) error {
	if request.WarningMinutes <= 0 {
		return httpx.BadRequest("warningMinutes must be a positive integer", map[string]any{
			"field": "warningMinutes",
			"value": request.WarningMinutes,
		})
	}
	if request.CriticalMinutes <= request.WarningMinutes {
		return httpx.BadRequest("criticalMinutes must be greater than warningMinutes", map[string]any{
			"field": "criticalMinutes",
			"value": request.CriticalMinutes,
		})
	}
	return nil
}

func providerAcknowledgementSLAUpdateActionForAdapter(adapterName string) string {
	if strings.TrimSpace(adapterName) == "" {
		return providerAcknowledgementSLADefaultUpdatedAction
	}
	return providerAcknowledgementSLAAdapterUpdatedAction
}

func isProviderAcknowledgementSLAAuditAction(action string) bool {
	normalized := strings.ToLower(strings.TrimSpace(action))
	return normalized == providerAcknowledgementSLADefaultUpdatedAction ||
		normalized == providerAcknowledgementSLAAdapterUpdatedAction
}

func providerAcknowledgementSLASettingDetails(entry providerAcknowledgementSLASetting) string {
	raw, err := json.Marshal(entry)
	if err != nil {
		return fmt.Sprintf(
			"adapter=%s warningMinutes=%d criticalMinutes=%d updatedAt=%s updatedBy=%s",
			entry.Adapter,
			entry.WarningMinutes,
			entry.CriticalMinutes,
			entry.UpdatedAt,
			entry.UpdatedBy,
		)
	}
	return string(raw)
}

func providerAcknowledgementSLASettingFromAuditEntry(
	entry auditLogEntry,
) (providerAcknowledgementSLASetting, bool, error) {
	if !isProviderAcknowledgementSLAAuditAction(entry.Action) {
		return providerAcknowledgementSLASetting{}, false, fmt.Errorf("unsupported action")
	}
	isDefault := strings.EqualFold(strings.TrimSpace(entry.Action), providerAcknowledgementSLADefaultUpdatedAction)

	var payload providerAcknowledgementSLASetting
	if err := json.Unmarshal([]byte(strings.TrimSpace(entry.Details)), &payload); err == nil {
		payload.Adapter = strings.TrimSpace(payload.Adapter)
		if !isDefault && payload.Adapter == "" {
			payload.Adapter = strings.TrimSpace(entry.TargetID)
		}
		if isDefault {
			payload.Adapter = ""
		}
		if payload.UpdatedAt == "" {
			payload.UpdatedAt = strings.TrimSpace(entry.OccurredAt)
		}
		if payload.UpdatedBy == "" {
			payload.UpdatedBy = strings.TrimSpace(entry.ActorID)
		}
		payload.Source = ""
		if err := validateProviderAcknowledgementSLAUpdateRequest(providerAcknowledgementSLAUpdateRequest{
			WarningMinutes:  payload.WarningMinutes,
			CriticalMinutes: payload.CriticalMinutes,
		}); err != nil {
			return providerAcknowledgementSLASetting{}, false, err
		}
		return payload, isDefault, nil
	}

	fields := parseAuditDetailFields(entry.Details)
	warning, err := parseProviderAcknowledgementSLAIntField(fields, "warningMinutes")
	if err != nil {
		return providerAcknowledgementSLASetting{}, false, err
	}
	critical, err := parseProviderAcknowledgementSLAIntField(fields, "criticalMinutes")
	if err != nil {
		return providerAcknowledgementSLASetting{}, false, err
	}
	setting := providerAcknowledgementSLASetting{
		Adapter:         strings.TrimSpace(fields["adapter"]),
		WarningMinutes:  warning,
		CriticalMinutes: critical,
		UpdatedAt:       strings.TrimSpace(entry.OccurredAt),
		UpdatedBy:       strings.TrimSpace(entry.ActorID),
	}
	if !isDefault && setting.Adapter == "" {
		setting.Adapter = strings.TrimSpace(entry.TargetID)
	}
	if isDefault {
		setting.Adapter = ""
	}
	if err := validateProviderAcknowledgementSLAUpdateRequest(providerAcknowledgementSLAUpdateRequest{
		WarningMinutes:  setting.WarningMinutes,
		CriticalMinutes: setting.CriticalMinutes,
	}); err != nil {
		return providerAcknowledgementSLASetting{}, false, err
	}
	return setting, isDefault, nil
}

func parseProviderAcknowledgementSLAIntField(fields map[string]string, key string) (int64, error) {
	value := strings.TrimSpace(fields[key])
	if value == "" {
		switch key {
		case "warningMinutes":
			value = strings.TrimSpace(fields["warning"])
		case "criticalMinutes":
			value = strings.TrimSpace(fields["critical"])
		}
	}
	if value == "" {
		return 0, fmt.Errorf("missing %s", key)
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

func parseInt64OrFallback(raw string, fallback int64) int64 {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func buildProviderAcknowledgementSLAUpdateEntry(
	request providerAcknowledgementSLAUpdateRequest,
	actor string,
	now time.Time,
) providerAcknowledgementSLASetting {
	return providerAcknowledgementSLASetting{
		Adapter:         strings.TrimSpace(request.Adapter),
		WarningMinutes:  request.WarningMinutes,
		CriticalMinutes: request.CriticalMinutes,
		UpdatedAt:       now.UTC().Format(time.RFC3339),
		UpdatedBy:       strings.TrimSpace(actor),
	}
}
