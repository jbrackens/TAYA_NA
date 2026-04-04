from django.dispatch import Signal

# Signal send by RegisterSerializer or Social registration
UserRegisteredSignal = Signal(providing_args=['user', 'email', 'key', 'expiration_date', 'msg_id'])
TrustedUserRegisteredSignal = Signal(providing_args=['user', 'msg_id'])

# Signal send when user added new email for
UserAddEmailSignal = Signal(providing_args=['user', 'email', 'key', 'expiration_date', 'msg_id'])

UserEmailVerifiedSignal = Signal(providing_args=['user', 'email', 'msg_id', ])

UserPasswordResetRequestSignal = Signal(providing_args=['user', 'email', 'key', 'expiration_date', 'msg_id'])

UserPasswordChangedKeySignal = Signal(providing_args=['user', 'email', 'msg_id'])
UserPasswordChangedApiSignal = Signal(providing_args=['user', 'email', 'msg_id'])
