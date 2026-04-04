from django.conf.urls import include
from django.urls import path

from . import antstream, backpack_items, orders, products, subscriptions

app_name = "virtual_store"
urlpatterns = [
    path("antstream/", include(antstream.urlpatterns)),
    path("subscriptions/", include(subscriptions.urlpatterns)),
    path("orders/", include(orders.urlpatterns)),
    path("backpack_items/", include(backpack_items.urlpatterns)),
    path("products/", include(products.urlpatterns)),
]
