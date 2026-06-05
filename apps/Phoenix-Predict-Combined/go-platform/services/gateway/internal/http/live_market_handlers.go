package http

import (
	stdhttp "net/http"

	"phoenix-revival/gateway/internal/livemarkets"
	"phoenix-revival/platform/transport/httpx"
)

func registerLiveMarketRoutes(mux *stdhttp.ServeMux, svc *livemarkets.Service) {
	if svc == nil {
		return
	}

	mux.Handle("/api/v1/live-markets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, svc.Snapshot())
	}))
}
