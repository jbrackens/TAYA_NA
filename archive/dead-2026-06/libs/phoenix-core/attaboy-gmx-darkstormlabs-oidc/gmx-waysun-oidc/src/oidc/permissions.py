from aws_rest_default.permissions import TokenHasScope
from rest_framework.exceptions import NotFound, PermissionDenied

from oidc.models import OidcPermissions


class TokenHasKidScope(TokenHasScope):
    def get_scopes(self, request, view):
        request_kid = view.kwargs.get("kid", None)
        required_permission = f"oidc:sign:{request_kid}"
        user_permissions = request.auth.get("extra", dict()).get("jpk", list())

        if not OidcPermissions.objects.filter(name=required_permission).exists():
            raise NotFound
        if required_permission in user_permissions:
            return (required_permission,)  # noqa
        raise PermissionDenied
