from rest_framework.pagination import PageNumberPagination
from collections import OrderedDict
from rest_framework.response import Response


# noinspection PyUnresolvedReferences
class PageUrlPageNumberPaginationMixing(object):
    def get_next_page(self):
        if not self.page.has_next():
            return None
        page_number = self.page.next_page_number()
        return page_number

    def get_previous_page(self):
        if not self.page.has_previous():
            return None
        page_number = self.page.previous_page_number()
        return page_number

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('next_page', self.get_next_page()),
            ('previous_page', self.get_previous_page()),
            ('results', data)
        ]))


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class SmallResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class WalletLinesListPagination(PageUrlPageNumberPaginationMixing, SmallResultsSetPagination):
    pass
