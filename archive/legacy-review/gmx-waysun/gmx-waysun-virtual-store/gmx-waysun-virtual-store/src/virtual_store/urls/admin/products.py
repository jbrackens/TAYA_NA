from django.conf.urls import url

from virtual_store.views.admin import AdminProductDetailsRUDView, AdminProductListCreateView

app_name = "virtual_store"
urlpatterns = [
    url(r"^$", AdminProductListCreateView.as_view(), name="admin_products"),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminProductDetailsRUDView.as_view(),
        name="admin_products_detail",
    ),
]
