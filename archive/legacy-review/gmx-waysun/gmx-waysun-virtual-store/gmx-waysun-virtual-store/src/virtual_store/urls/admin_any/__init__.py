from django.conf.urls import include
from django.urls import path

from . import backpack_items, cyclic, orders, products, subscriptions

app_name = "virtual_store"
urlpatterns = [
    path("subscriptions/", include(subscriptions.urlpatterns)),
    path("orders/", include(orders.urlpatterns)),
    path("backpack_items/", include(backpack_items.urlpatterns)),
    path("products/", include(products.urlpatterns)),
    path("cyclic/", include(cyclic.urlpatterns)),
]
