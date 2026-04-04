from django.conf.urls import url

from virtual_store import views

app_name = "virtual_store"

urlpatterns = [
    url(r"^products$", views.ProductsView.as_view(), name="products"),
    url(r"^subscriptions$", views.UsersSubscriptionsView.as_view(), name="subscriptions"),
    url(r"^orders$", views.UsersOrdersView.as_view(), name="orders"),
]
