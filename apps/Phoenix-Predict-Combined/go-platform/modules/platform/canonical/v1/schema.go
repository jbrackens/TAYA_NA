package v1

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

const (
	SchemaName  = "phoenix.canonical.sportsbook"
	SchemaMajor = 1
	SchemaMinor = 0
	SchemaPatch = 0
)

var (
	// SchemaVersion is semver and is used by adapters to declare compatibility.
	SchemaVersion = fmt.Sprintf("%d.%d.%d", SchemaMajor, SchemaMinor, SchemaPatch)

	ErrInvalidVersion = errors.New("invalid schema version")
)

type Version struct {
	Major int `json:"major"`
	Minor int `json:"minor"`
	Patch int `json:"patch"`
}

type SchemaInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Major   int    `json:"major"`
	Minor   int    `json:"minor"`
	Patch   int    `json:"patch"`
}

func CurrentSchema() SchemaInfo {
	return SchemaInfo{
		Name:    SchemaName,
		Version: SchemaVersion,
		Major:   SchemaMajor,
		Minor:   SchemaMinor,
		Patch:   SchemaPatch,
	}
}

func ParseVersion(raw string) (Version, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return Version{}, ErrInvalidVersion
	}

	parts := strings.Split(value, ".")
	if len(parts) != 3 {
		return Version{}, ErrInvalidVersion
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return Version{}, ErrInvalidVersion
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return Version{}, ErrInvalidVersion
	}
	patch, err := strconv.Atoi(parts[2])
	if err != nil {
		return Version{}, ErrInvalidVersion
	}

	if major < 0 || minor < 0 || patch < 0 {
		return Version{}, ErrInvalidVersion
	}

	return Version{
		Major: major,
		Minor: minor,
		Patch: patch,
	}, nil
}

func IsCompatible(raw string) bool {
	version, err := ParseVersion(raw)
	if err != nil {
		return false
	}
	return version.Major == SchemaMajor
}
