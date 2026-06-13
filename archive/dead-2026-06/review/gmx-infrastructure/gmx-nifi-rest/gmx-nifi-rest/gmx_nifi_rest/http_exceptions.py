import logging
import traceback

from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from starlette import status
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class DirectHttpException(HTTPException):
    """
    This exception is used to return exact value instead wrapping into "details" keyword
    """


# noinspection PyUnusedLocal
async def direct_http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    headers = getattr(exc, "headers", None)
    if headers:
        return JSONResponse(exc.detail, status_code=exc.status_code, headers=headers)
    else:
        return JSONResponse(exc.detail, status_code=exc.status_code)


# noinspection PyUnusedLocal
async def all_exception_logger(request: Request, exc: Exception) -> JSONResponse:
    tb = traceback.TracebackException.from_exception(exc)
    logger.error(
        "Error during processing request \n{} \n\nGot: \n{} \n\nTraceback: \n{}".format(
            request.headers.items(), exc, "".join(tb.stack.format())
        )
    )
    return JSONResponse({"detail": str(exc)}, status_code=500)


async def request_validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.error("Errors in request: \n{}\n\nErrors:\n{}".format(request.headers.items(), exc.errors))
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": exc.errors()})
