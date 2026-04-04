package tech.argyll.gmx.predictorgame.security.auth.jwt

case class JSONWebKey(kid: String, kty: String, alg: String, use: String, n: String, e: String)