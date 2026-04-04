package tech.argyll.gmx.predictorgame.security.auth

import tech.argyll.gmx.predictorgame.common.exception.BaseException

class InvalidTokenException(message: String) extends BaseException(message)