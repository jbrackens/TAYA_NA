import json
from uuid import uuid4

import nacl.signing
import requests

public_key = '462185bfc68cf1bf99a72fca52619473e4b1655531fbf3dea82ae7d1a973fe1f'
private_key = '046da521b0e17bda321342b9992018b8b0474e9098df44762d8ced9692db6815'

price = 100
for_user = 'rmx_df85ace654584753bff451c53798ab92'
title = 'Example transaction for 100 points'
transaction_id = uuid4().hex

endpoint = 'http://localhost:8080/{}/wallet/create'.format(public_key)

# ================================================================
payload = {
    'price': price,
    'tier': 1,
    'for_user': for_user,
    'title': title,
    'transaction_id': transaction_id
}

payload_str = json.dumps(payload)
payload_bytes = payload_str.encode()

signing_key = nacl.signing.SigningKey(private_key, encoder=nacl.encoding.HexEncoder)

# Sign a message with the signing key
signed = signing_key.sign(payload_bytes, encoder=nacl.encoding.HexEncoder)

# Obtain the Signature for message
signature = signed.signature

# =============================================================
headers = {
    'Authorization': 'Signature {}'.format(signature.decode())
}

# data must payload string to be the same as signature
response = requests.post(endpoint, data=payload_str, headers=headers)

print(response.status_code)
print(response.text)
