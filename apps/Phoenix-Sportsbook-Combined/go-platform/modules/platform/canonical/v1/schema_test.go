package v1

import "testing"

func TestCurrentSchema(t *testing.T) {
	schema := CurrentSchema()
	if schema.Name != SchemaName {
		t.Fatalf("expected schema name %q, got %q", SchemaName, schema.Name)
	}
	if schema.Version != SchemaVersion {
		t.Fatalf("expected schema version %q, got %q", SchemaVersion, schema.Version)
	}
	if schema.Major != SchemaMajor || schema.Minor != SchemaMinor || schema.Patch != SchemaPatch {
		t.Fatalf("unexpected schema semver parts: %+v", schema)
	}
}

func TestIsCompatible(t *testing.T) {
	cases := []struct {
		name    string
		version string
		want    bool
	}{
		{name: "exact", version: "1.0.0", want: true},
		{name: "minor patch upgrade", version: "1.2.9", want: true},
		{name: "different major", version: "2.0.0", want: false},
		{name: "invalid", version: "v1", want: false},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			if got := IsCompatible(tc.version); got != tc.want {
				t.Fatalf("expected compatible=%t for version %q, got %t", tc.want, tc.version, got)
			}
		})
	}
}
