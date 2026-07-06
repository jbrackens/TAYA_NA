# Java 21 Transition Profile

This profile standardizes Java selection for legacy Phoenix backend tasks during the Go migration period.

## Commands

```bash
make java-profile
source /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/.runtime/java-profile.env
```

`make java-profile` writes `.runtime/java-profile.env` with:

- `JAVA_PROFILE_VERSION` (targeted profile version)
- `JAVA_HOME` (resolved path)
- `PATH` prefixed with `${JAVA_HOME}/bin`

## Resolution Rules

1. Preferred version defaults to Java 21.
2. Fallback defaults to Java 17 when Java 21 is unavailable.
3. Local stack startup honors `JAVA_PROFILE_VERSION`:
   - `21` (default): try Java 21, fallback Java 17.
   - `17`: force Java 17.
   - `auto`: try Java 21 then Java 17.

## Usage in This Program

- `make verify-backend` and local stack startup use Java 21-first behavior for transitional compatibility.
- Existing Java 17 path remains supported to avoid blocking local bring-up while Java 21 rollout is completed.
