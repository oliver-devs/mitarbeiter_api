from typing import override

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class FlexiblePagination(PageNumberPagination):
    """
    Erweiterte Pagination die ?page_size=0 unterstützt um alle Ergebnisse
    ohne Paginierung zurückzugeben. Nützlich für Dropdowns, Kalender, etc.

    - ?page_size=50  → 50 Ergebnisse pro Seite
    - ?page_size=0   → Alle Ergebnisse (keine Paginierung)
    - ohne Parameter → Standard PAGE_SIZE (25)
    """
    page_size_query_param = "page_size"
    max_page_size = 500

    @override
    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get(self.page_size_query_param) == "0":
            self._no_pagination = True
            return None
        self._no_pagination = False
        return super().paginate_queryset(queryset, request, view)

    @override
    def get_paginated_response(self, data):
        if getattr(self, "_no_pagination", False):
            return Response(data)
        return super().get_paginated_response(data)
