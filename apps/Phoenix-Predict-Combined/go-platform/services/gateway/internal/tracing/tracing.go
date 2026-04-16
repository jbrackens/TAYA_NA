package tracing

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.opentelemetry.io/otel/trace"
)

const tracerName = "phoenix-revival/gateway"

// Init configures the global OTel TracerProvider based on environment variables.
//
//	OTEL_EXPORTER_OTLP_ENDPOINT — if set, use OTLP/gRPC exporter (e.g. "localhost:4317")
//	OTEL_TRACES_EXPORTER=stdout — use stdout JSON exporter (useful in dev)
//	Unset / empty — noop (tracing disabled, zero overhead)
//
// Returns a shutdown function that should be deferred from main.
func Init(ctx context.Context, serviceName, serviceVersion string) (func(context.Context) error, error) {
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceVersionKey.String(serviceVersion),
		),
	)
	if err != nil {
		return noop, err
	}

	exporter, err := buildExporter(ctx)
	if err != nil {
		return noop, err
	}
	if exporter == nil {
		slog.Info("tracing: disabled (no exporter configured)")
		return noop, nil
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	slog.Info("tracing: initialized", "service", serviceName)
	return tp.Shutdown, nil
}

func buildExporter(ctx context.Context) (sdktrace.SpanExporter, error) {
	endpoint := strings.TrimSpace(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))
	if endpoint != "" {
		return otlptracegrpc.New(ctx,
			otlptracegrpc.WithEndpoint(endpoint),
			otlptracegrpc.WithInsecure(), // TLS configurable via OTEL_EXPORTER_OTLP_INSECURE
		)
	}

	exporterType := strings.ToLower(strings.TrimSpace(os.Getenv("OTEL_TRACES_EXPORTER")))
	if exporterType == "stdout" {
		return stdouttrace.New(stdouttrace.WithPrettyPrint())
	}

	return nil, nil
}

// Middleware creates an HTTP tracing middleware that starts a span per request
// and injects trace_id into the response header and request context.
func Middleware() func(http.Handler) http.Handler {
	tracer := otel.Tracer(tracerName)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract incoming trace context (if propagated from upstream)
			ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))

			spanName := r.Method + " " + r.URL.Path
			ctx, span := tracer.Start(ctx, spanName,
				trace.WithSpanKind(trace.SpanKindServer),
				trace.WithAttributes(
					semconv.HTTPRequestMethodKey.String(r.Method),
					semconv.URLPath(r.URL.Path),
					semconv.ServerAddress(r.Host),
				),
			)
			defer span.End()

			// Inject trace_id into response header for client-side correlation
			sc := span.SpanContext()
			if sc.HasTraceID() {
				w.Header().Set("X-Trace-Id", sc.TraceID().String())
			}

			// Serve with traced context
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// SpanFromContext returns the current span from context, for adding events/attributes.
func SpanFromContext(ctx context.Context) trace.Span {
	return trace.SpanFromContext(ctx)
}

// TraceIDFromContext extracts the trace ID string from context (empty if none).
func TraceIDFromContext(ctx context.Context) string {
	sc := trace.SpanFromContext(ctx).SpanContext()
	if sc.HasTraceID() {
		return sc.TraceID().String()
	}
	return ""
}

// StartSpan is a convenience wrapper around otel.Tracer().Start() for use
// in service code (wallet mutations, settlement, compliance checks).
func StartSpan(ctx context.Context, name string, attrs ...attribute.KeyValue) (context.Context, trace.Span) {
	return otel.Tracer(tracerName).Start(ctx, name, trace.WithAttributes(attrs...))
}

func noop(_ context.Context) error { return nil }
