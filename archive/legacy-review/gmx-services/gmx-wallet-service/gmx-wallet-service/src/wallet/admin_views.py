from django.urls.base import reverse
from django.views.generic.dates import MonthArchiveView

from .models import WalletLine
from datetime import date
from project.admin import complex_admin


class BprTransactionsListTemplateView(MonthArchiveView):
    template_name = 'admin/wallet/bpr_transaction_list.html'
    date_field = 'operation_date'
    queryset = WalletLine.objects.\
        filter(operation_type__exact=WalletLine.OPERATION_TYPE_CHOICES.BPR).\
        values(
            'wallet__id',
            'wallet__user__username',
            'operation_date',
            'amount',
            'src_transaction_id',
            'src_title'
        )

    year_format = '%Y'
    month_format = '%m'
    allow_empty = True
    paginate_by = None
    start_date = 2017

    def get_context_data(self, **kwargs):
        context = dict(complex_admin.each_context(self.request))
        report_data = []
        ys = list(self._get_date_years())
        ms = list(self._get_date_links())
        for i in range(len(ys)):
            report_data.append({
                'year': ys[i],
                'data': ms[i]
            })
        context.update({
            'year_str': self.year,
            'month_str': self.month,
            'report_data': report_data,
            'selected_report_id': self._gen_report_id(self.year, self.month)
        })
        context.update(
            super().get_context_data(**kwargs)
        )
        return context

    def _gen_report_id(self, y, m):
        return 'bpr_{}_{}'.format(y, m)

    def _get_date_years(self):
        return [x for x in range(self.start_date, date.today().year+1)]

    def _get_date_links(self):
        result = [
            [
                {
                    'link': reverse('admin:wallet_bpr', kwargs={'year': y, 'month': '%02d' % (m+1)}),
                    'value': '%02d' % (m+1),
                    'report_id': self._gen_report_id(y, '%02d' % (m+1)),
                }
                for m in range(12)
            ]
            for y in self._get_date_years()
        ]
        return result

    def _get_kwarg_date_fragment(self, fragment, date_format):
        result = getattr(self, 'kwargs', {}).get(fragment)
        if result is None:
            result = date.today().strftime(date_format)
        return result

    @property
    def year(self):
        return self._get_kwarg_date_fragment('year', '%Y')

    @property
    def month(self):
        return self._get_kwarg_date_fragment('month', '%m')
