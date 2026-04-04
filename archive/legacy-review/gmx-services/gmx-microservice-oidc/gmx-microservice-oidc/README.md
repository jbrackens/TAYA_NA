# gmx-microservice-oidc
This is a GMX microservice - OpenID Connect



#### Genereting JWT_SECRET_KEY:

You need to import in python console:
```
import nacl.secret
```

And then generate new JWT_SECRET_KEY:

 ```
 key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
 JWT_SECRET_KEY = key.hex()
 ```
 