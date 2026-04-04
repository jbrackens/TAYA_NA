from django.conf.urls import url

from virtual_store.views.admin import (
    AdminBackpackItemActivateView,
    AdminBackpackItemDeactivateView,
    AdminBackpackItemDetachView,
    AdminBackpackItemRetrieveView,
    AdminBackpackItemsForUserView,
)

app_name = "virtual_store"
urlpatterns = [
    url(
        r"^for_user/(?P<user_sub>(gmx_[a-fA-f0-9\-]{32,36}))$",
        AdminBackpackItemsForUserView.as_view(),
        name="admin_backpack_items_for_user",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminBackpackItemRetrieveView.as_view(),
        name="admin_backpack_items_details",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))/activate$",
        AdminBackpackItemActivateView.as_view(),
        name="admin_backpack_items_activate",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))/deactivate$",
        AdminBackpackItemDeactivateView.as_view(),
        name="admin_backpack_items_deactivate",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))/detach$",
        AdminBackpackItemDetachView.as_view(),
        name="admin_backpack_items_detach",
    ),
]
