from django.conf.urls import url

from virtual_store.views.admin_any import AdminAnyProductDetailsRUDView, AdminAnyProductListCreateView

app_name = "virtual_store"
urlpatterns = [
    url(r"^$", AdminAnyProductListCreateView.as_view(), name="admin_any_products"),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminAnyProductDetailsRUDView.as_view(),
        name="admin_any_products_detail",
    ),
]
