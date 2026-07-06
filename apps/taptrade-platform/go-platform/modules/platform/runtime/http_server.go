package runtime

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

func RunHTTPServer(ctx context.Context, cfg ServiceConfig, handler http.Handler) error {
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown %s server: %w", cfg.Name, err)
		}
		return nil
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("start %s server: %w", cfg.Name, err)
		}
		return nil
	}
}
