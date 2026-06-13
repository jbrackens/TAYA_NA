from typing import List

from aws_rest_default.schema import GmxSchemaGenerator


class OidcSchemaGenerator(GmxSchemaGenerator):
    def _get_servers(self) -> List[dict]:
        return [
            {
                "url": "{request.url.scheme}://{request.url.host}:{request.url.port}",
                "description": "local",
                "variables": {
                    "request.url.scheme": {"default": "http", "description": "connection proto type"},
                    "request.url.host": {"default": "local.darkstormlabs", "description": "Server hostname or IP"},
                    "request.url.port": {"default": "8000", "description": "Server port"},
                },
            }
        ]

    def _get_info(self) -> dict:
        return {
            "title": "OIDC",
            "version": "0.0.1",
            "description": "OIDC Microservice as the name suggest itself is being used for OpenID Connect authentication flow. This service stores whole profile data, permissions and basically is the core of AAA pattern, where AAA stands for:\n\n* Authentication\n* Authorization\n* Accounting\n\nIt has OpenID Connect capabilities with some features from OAuth2. Covers Authorization Code, Authorization Code with PCKE Challenge, Implicit and Hybrid flows.\n\nThis is a list of specifications it meets:\n\n* OpenID Connect Discovery 1.0\n* OpenID Connect Session Management 1.0\n* OAuth 2.0 Resource Owner Password Credentials Grant\n* Proof Key for Code Exchange by OAuth Public Clients\n* Social accounts authorization - Twitter, Google+, Facebook",
            "contact": {"name": "Wojciech Bartosiak", "email": "wojtek@flipsports.com"},
        }

    def _get_external_schemas(self) -> dict:
        return {
            "JSONWebKey": {"required": ["use", "kty", "kid", "alg"], "type": "object"},
            "OauthTokenResponse": {
                "description": "The token response",
                "enum": [],
                "type": "object",
                "properties": {
                    "access_token": {
                        "description": "The access token issued by the authorization server.",
                        "type": "string",
                    },
                    "expires_in": {
                        "format": "int64",
                        "description": 'The lifetime in seconds of the access token.  For example, the value "3600" denotes that the access token will\nexpire in one hour from the time the response was generated.',
                        "type": "integer",
                    },
                    "id_token": {
                        "format": "int64",
                        "description": "To retrieve a refresh token request the id_token scope.",
                        "type": "integer",
                    },
                    "refresh_token": {
                        "description": 'The refresh token, which can be used to obtain new\naccess tokens. To retrieve it add the scope "offline" to your access token request.',
                        "type": "string",
                    },
                    "scope": {"description": "The scope of the access token", "type": "string"},
                    "token_type": {"description": "The type of the token issued", "type": "string"},
                },
                "required": ["expires_in", "id_token", "token_type"],
            },
            "OidcWellKnownResponse": {
                "title": "WellKnown",
                "description": "OpenID Connect supports a discovery protocol that contains information that you can use to configure your apps and authenticate users such as tokens and public keys.",
                "required": [
                    "authorization_endpoint",
                    "id_token_signing_alg_values_supported",
                    "issuer",
                    "jwks_uri",
                    "response_types_supported",
                    "token_endpoint",
                ],
                "type": "object",
            },
        }

    def get_schema(self, request=None, public=False):
        schema = super().get_schema(request=request, public=public)
        schema.setdefault("components", dict())
        schema["components"].setdefault("schemas", dict())
        schema["components"]["schemas"].update(self._get_external_schemas())
        schema.setdefault("info", dict())
        schema["info"].update(self._get_info())
        schema.setdefault("servers", list())
        schema["servers"].extend(self._get_servers())
        return schema

    def get_paths(self, request=None):
        paths: dict = super().get_paths(request=request)
        paths.update(
            {
                "/openid/token": {
                    "post": {
                        "requestBody": {
                            "content": {
                                "application/x-www-form-urlencoded": {
                                    "schema": {
                                        "required": ["grant_type"],
                                        "type": "object",
                                        "properties": {
                                            "grant_type": {"type": "string"},
                                            "code": {"type": "string"},
                                            "redirect_uri": {"type": "string"},
                                            "client_id": {"type": "string"},
                                        },
                                        "example": "",
                                    }
                                }
                            }
                        },
                        "tags": ["oidc"],
                        "responses": {
                            "200": {
                                "description": "OK",
                                "content": {
                                    "application/json": {"schema": {"$ref": "#/components/schemas/OauthTokenResponse"}}
                                },
                            }
                        },
                        "security": [{"basic": []}],
                        "operationId": "oidc::token::post",
                        "summary": "The OAuth 2.0 token endpoint",
                        "description": "The token endpoint is used by the client to obtain an access token by presenting its authorization grant.\n",
                    },
                },
                "/openid/authorize": {
                    "get": {
                        "tags": [
                            "oidc",
                        ],
                        "operationId": "oidc::authorize::get",
                        "summary": "The OAuth 2.0 authorize endpoint",
                        "description": "The resource owner (end user) is redirected to this endpoint at the beginning of the authentication process,\nand it is used to obtain an authorization grant.\n",
                        "responses": {
                            "200": {"description": "OK"},
                            "302": {"description": "Found"},
                            "401": {"description": "Unauthorized"},
                            "403": {"description": "Forbidden"},
                        },
                    },
                },
                "/openid/.well-known/openid-configuration": {
                    "get": {
                        "tags": ["oidc"],
                        "responses": {
                            "200": {
                                "description": "OK",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/OidcWellKnownResponse"},
                                        "examples": {
                                            "example-1": {
                                                "value": {
                                                    "issuer": "http://127.0.0.1:8000/openid",
                                                    "authorization_endpoint": "http://127.0.0.1:8000/openid/authorize",
                                                    "token_endpoint": "http://127.0.0.1:8000/openid/token",
                                                    "userinfo_endpoint": "http://127.0.0.1:8000/openid/userinfo",
                                                    "end_session_endpoint": "http://127.0.0.1:8000/openid/end-session",
                                                    "introspection_endpoint": "http://127.0.0.1:8000/openid/introspect",
                                                    "response_types_supported": [
                                                        "code",
                                                        "id_token",
                                                        "id_token token",
                                                        "code token",
                                                        "code id_token",
                                                        "code id_token token",
                                                    ],
                                                    "jwks_uri": "http://127.0.0.1:8000/openid/jwks",
                                                    "id_token_signing_alg_values_supported": ["HS256", "RS256"],
                                                    "subject_types_supported": ["public"],
                                                    "token_endpoint_auth_methods_supported": [
                                                        "client_secret_post",
                                                        "client_secret_basic",
                                                    ],
                                                }
                                            }
                                        },
                                    }
                                },
                            }
                        },
                        "operationId": "oidc::well-known::configuration::get",
                        "summary": "OpenID Connect Discovery",
                        "description": "The well known endpoint can be used to retrieve configuration information for OpenID Connect clients.",
                    },
                },
                "/openid/jwks": {
                    "get": {
                        "tags": ["oidc"],
                        "responses": {
                            "200": {
                                "description": "OK",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "keys": {
                                                    "type": ["array"],
                                                    "items": {"$ref": "#/components/schemas/JSONWebKey"},
                                                }
                                            },
                                        }
                                    }
                                },
                            }
                        },
                        "operationId": "oidc::well-known::jwks::get",
                        "summary": "JSON Web Keys Discovery",
                        "description": "This endpoint returns JSON Web Keys to be used as public keys for verifying OpenID Connect ID Tokens",
                    },
                },
            }
        )
        return paths
