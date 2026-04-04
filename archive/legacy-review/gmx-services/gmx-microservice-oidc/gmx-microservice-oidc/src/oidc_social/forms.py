from aws_rest_default.tools import decrypt_b64
from django import forms


class EmailForm(forms.Form):
    email = forms.EmailField(required=True)
    data_bag = forms.CharField(required=True, widget=forms.HiddenInput)

    def clean(self):
        super().clean()
        try:
            data_bag_decoded = decrypt_b64(self.cleaned_data.get('data_bag'))
        except Exception:
            self.add_error('data_bag', 'damaged')
            return

        self.cleaned_data['profile'] = data_bag_decoded.get('p')
        self.cleaned_data['client_id'] = data_bag_decoded.get('c')
        self.cleaned_data['social_type'] = data_bag_decoded.get('st')
        self.cleaned_data['social_token'] = data_bag_decoded.get('tk')
        self.cleaned_data['next_param'] = data_bag_decoded.get('n')
        self.cleaned_data['profile']['email'] = self.cleaned_data.get('email')
