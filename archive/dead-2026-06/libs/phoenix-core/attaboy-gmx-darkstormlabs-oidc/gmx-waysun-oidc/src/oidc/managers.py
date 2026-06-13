from common.models import CommonManager


class CustomOidcClientExtraManager(CommonManager):
    def filter(self, *args, **kwargs):
        return (
            super()
            .filter(*args, **kwargs)
            .select_related("oidc_client")
            .prefetch_related("default_permissions_set", "limited_permissions_set")
        )

    def all(self):
        return (
            super()
            .all()
            .select_related("oidc_client")
            .prefetch_related("default_permissions_set", "limited_permissions_set")
        )
