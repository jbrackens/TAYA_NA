from django.conf.urls import url

from virtual_store.views.admin_any import (
    AdminAnyBackpackItemActivateView,
    AdminAnyBackpackItemDeactivateView,
    AdminAnyBackpackItemDetachView,
    AdminAnyBackpackItemRetrieveView,
    AdminAnyBackpackItemsForUserView,
)

app_name = "virtual_store"
urlpatterns = [
    url(
        r"^for_user/(?P<user_sub>(gmx_[a-fA-f0-9\-]{32,36}))$",
        AdminAnyBackpackItemsForUserView.as_view(),
        name="admin_any_backpack_items_for_user",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminAnyBackpackItemRetrieveView.as_view(),
        name="admin_any_backpack_items_details",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))/activate$",
        AdminAnyBackpackItemActivateView.as_view(),
        name="admin_any_backpack_items_activate",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))/deactivate$",
        AdminAnyBackpackItemDeactivateView.as_view(),
        name="admin_any_backpack_items_deactivate",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))/detach$",
        AdminAnyBackpackItemDetachView.as_view(),
        name="admin_any_backpack_items_detach",
    ),
]
