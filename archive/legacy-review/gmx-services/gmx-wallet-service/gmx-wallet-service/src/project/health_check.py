import logging

from django.http import HttpResponse, HttpRequest

logger = logging.getLogger(__name__)


def health_check(request):
    assert isinstance(request, HttpRequest)
    logger.info("Health check: OK")
    return HttpResponse(request.get_full_path())
