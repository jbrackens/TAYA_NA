package runtime

import "os"

type ServiceConfig struct {
	Name string
	Port string
}

func LoadServiceConfig(name string, defaultPort string) ServiceConfig {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	return ServiceConfig{
		Name: name,
		Port: port,
	}
}
