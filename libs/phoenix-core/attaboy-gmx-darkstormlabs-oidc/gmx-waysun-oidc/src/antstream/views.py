from aws_rest_default.schema import DefaultGmxSchema
from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import generics
from rest_framework.permissions import AllowAny

from . import serializers


class AntstreamLoginApiView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    http_method_names = (
        "post",
        "options",
    )
    serializer_class = serializers.AntstreamLoginSerializer
    authentication_classes = ()
    permission_classes = (AllowAny,)
    schema = DefaultGmxSchema(
        tags=["antstream"],
        example_responses={
            "example-1": {
                "antstream_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlZjdlZGVkMWIyZTg4OGIyOWRiMDA0MmU5NjFlZTc2In0."
                "eyJzdWIiOiJnbXhfZDgwMjViYmU5NDFiNDdlMmIwNjhmYTM1Y2NmMzllY2YiLCJhdWQiOiI5MTc5"
                "NDgiLCJleHAiOjE1OTc4NTQ4MzEsImlhdCI6MTU5Nzg0NzYzMSwibmJmIjoxNTk3ODQ3NjMxfQ."
                "PVb8ro7xr8Y5fe0i_QyxKvkmkFxgtF5QCiKKoi67o3Uc2zRYuQddC2dXgwxjlsqqDJ5iNaGE8mn8"
                "XrsN8bKWxfuQ8eX0Fq5_u3uhQJRBgPXavqHfc_6cX2DaoObV1v0Yk2PYXT4a0mUWJn2u0iHGvQVO"
                "Y4y-U4eVXdFENp51iT94gocuWpBL50r9JXBf1i40Q7PXENA4Mwzdy5MUIOwLGkJA9eCX0osjbX4N"
                "k3FEzUR4DhzD2pp1KLZ0FyjNmZICDnwe7O3OWWLBl1ykeNmx34mO7ckUmNzgLufZRfdqZPNFcDoz"
                "n2tG9e7VmI0LajCoS73p2prIuo1iay-jC0OkTQ",
                "order_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlZjdlZGVkMWIyZTg4OGIyOWRiMDA0MmU5NjFlZTc2In0",
            }
        },
        example_requests={"example-1": {"user_id": "bad6f89c-3e78-4f88-a462-538ee69013fe"}},
    )
