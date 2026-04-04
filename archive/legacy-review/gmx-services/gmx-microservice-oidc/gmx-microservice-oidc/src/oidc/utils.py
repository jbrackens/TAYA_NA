import nacl.encoding
import nacl.signing


def get_private_ed25519_sign_key_hex():
    """
    Generates Ed25519 signature signing Private Key
    :return: 32-bytes, hex-encoded private key
    :rtype str
    """
    return nacl.signing.SigningKey.generate().encode(encoder=nacl.encoding.HexEncoder).decode()


def get_private_ed25519_sign_key(private_key_hex):
    """
    Converts Private Hex-encoded Key to nacl.signing.SigningKey object
    :param private_key_hex: 32-bytes, hex-encoded private key
    :type private_key_hex: str
    :return: nacl.signing.SigningKey object (private key)
    :rtype: nacl.signing.SigningKey
    """
    return nacl.signing.SigningKey(seed=private_key_hex.encode(), encoder=nacl.encoding.HexEncoder)


def get_public_ed25519_sign_key(private_key_hex):
    """
    Converts Private Hex-encoded Key to nacl.signing.VerifyKey object
    :param private_key_hex: 32-bytes, hex-encoded private key
    :type private_key_hex: str
    :return: nacl.signing.VerifyKey object (public key)
    :rtype: nacl.signing.VerifyKey
    """
    return get_private_ed25519_sign_key(private_key_hex).verify_key


def get_public_ed25519_sign_key_hex(private_key_hex):
    """
    Converts Private Hex-encoded Key to Public Hex-encoded Key
    :param private_key_hex: 32-bytes, hex-encoded private key
    :type private_key_hex: str
    :return: Public Hex-encoded Key
    :rtype: str
    """
    return get_public_ed25519_sign_key(private_key_hex).encode(nacl.encoding.HexEncoder).decode()


PERMISSIONS_LIST = (
    ('oidc:profile:read', 'to read Profile data'),
    ('oidc:profile:write', 'to write Profile data'),
    ('oidc:profile:search', 'to search Profile'),
    ('oidc:profile:last_seen:write', 'Used to "touch" last login date'),
    ('oidc:email:read', 'to read User\'s Emails'),
    ('oidc:email:write', 'to write User\'s Emails'),
    ('oidc:address:read', 'to read User\'s Addresses'),
    ('oidc:address:write', 'to write User\'s Addresses'),
    ('oidc:phone:read', 'to read User\'s Phone numbers'),
    ('oidc:phone:write', 'to write User\'s Phone numbers'),
    ('oidc:password:write', 'to change password'),
    ('oidc:api_keys:read', 'to read Ed25519 API keys'),
    ('oidc:register:write', 'to register user where originator will be auth user'),
    ('oidc:social:token:read', 'To read token used during login'),

    ('oidc:company:read', 'to read Company data'),
    ('oidc:external_user:write', 'to create temporary user or get mapping for customer'),
    ('oidc:external_user:bulk:write', 'Bulk version of API to create temporary user or get mapping for customer'),

    ('oidc:data_export:ext_user_mapping:read', 'Used to export data from database - ExtUserMapping'),
    ('oidc:data_export:custom_user:read', 'Used to export data from database - CustomUser'),

    #
    # ('wallet:transaction_keys:read', 'to read WooCommerce keys'),
    # ('wallet:transaction_keys:recreate:read', 'to regenerate WooCoomerce keys'),
    # ('wallet:ext_order:read', 'to read data of ExternalOrder, used on Payment confirmation page'),

    ('wallet:current_balance:read', 'to see current balance on wallet'),
    ('wallet:current_balance:for_user:from_company:read', 'Get or create wallet for user in behalf of company'),
    ('wallet:details:read', 'to fetch details of wallet'),
    ('wallet:details:write', 'to edit name of the wallet'),
    ('wallet:wallets:read', 'to fetch list of all wallets'),
    ('wallet:lines:read', 'to fetch list of all lines for wallet',),

    ('wallet:line:write', 'topUp wallet'),
    ('wallet:line:from_company:write', 'Create line in behalf of company despite of authorized user'),
    ('wallet:line:bpr:write', 'Product - Buy'),
    ('wallet:line:bpr:silent:write', 'Product - Buy - Silent i.e. for IR'),
    ('wallet:line:bpr:silent:list:read', 'Product - Buy - Silent i.e. for IR - export list with filtering'),
    ('wallet:token:exchange', 'Token exchange for user data'),
    ('wallet:token:current_balance', 'User current balance from payment token'),

    ('wallet:current_balance:for_user:read', 'to see current balance on wallet for specific user sub'),
    ('wallet:create_for_user:write', 'create wallet for user'),

    ('wallet:data_export:wallet_line:read', 'Permission to search and filter WalletLines'),
    ('wallet:data_export:bpr_inc_in_circulation:read', 'Permission to search points added and spend by players'),
    ('wallet:data_export:user_wallet_balance:read', 'Permission to fetch user current balance and last BPR activity'),

    ('pc:token_exchange:for_user_info:sport_nation', 'Exchange SBTech token for SportNation for user info'),
    ('pc:token_exchange:for_user_info:red_zone', 'Exchange SBTech token for RedZone for user info'),
    ('pc:token_exchange:sport_nation', 'Exchange SBTech token for SportNation'),
    ('pc:token_exchange:red_zone', 'Exchange SBTech token for RedZone'),
    ('pc:user_activity:top_up:single:write', 'Start async top up process for user activity - Single'),
    ('pc:user_activity:top_up:bundle:write', 'Start async top up process for user activity - Bundle'),
    ('pc:process:simple:read', 'Simple process details'),
    ('pc:process:complex:read', 'Complex process details'),
    ('pc:handle_signal:write', 'Start async process for signal handling i.e. sending mail'),
    ('pc:send_event:write', 'Send Event notification'),
    ('pc:referral:bonus:single:write', 'Referral system - add points and history - Single'),
    ('pc:referral:bonus:bulk:write', 'Referral system - add points and history - Bundle'),
    ('pc:virtual_shop_payment:red_zone', 'VirtualShop - Payment process for RedZone'),
    ('pc:virtual_shop_payment:sport_nation', 'VirtualShop - Payment process for SportNation'),

    ('referral:events:write', 'Receive Event notification'),

    ('tna:tags:read', 'to read list of Tags'),
    ('tna:user_tags:read', 'to read User\'s TagCloud'),
    ('tna:user_tags:write', 'to write User\'s TagCloud'),
    ('tna:ads:read', 'to list/search Ads'),
    ('tna:ads:write', 'to create Ad'),
    ('tna:ads:statistic:read', 'to read statistics about my ads'),
    ('tna:ads_search_stats:read', 'to read my searched tags history - SearchCloud'),

    ('push:gcm:read', 'List Android Devices'),
    ('push:gcm:write', 'Create Android Device'),
    ('push:apns:read', 'List of Apple based devices'),
    ('push:apns:write', 'Create Apple based device'),
    ('push:mail:write', 'Send email'),
    ('push:notification:write', 'Send Notifications'),

    ('private_wallet:currency:exchange:read', 'Fetch list of currency exchanges'),
    ('private_wallet:currency:read', 'list Of currencies'),
    ('private_wallet:current_balance:read', 'current balance per currency'),
    ('private_wallet:product:read', 'read product'),
    ('private_wallet:product:write', 'edit product'),
    ('private_wallet:products:read', 'list of products'),
    ('private_wallet:products:write', 'create product'),
    ('private_wallet:wallet:exchange:write', 'create exchange of currencies'),
    ('private_wallet:wallet:lines:read', 'list of lines for wallet/currency'),
    ('private_wallet:wallet:lines:write', 'create line for wallet/cuurency'),
    ('private_wallet:wallet:read', 'read definition of wallet/currency'),
    ('private_wallet:wallet:write', 'write definition of wallet'),
    ('private_wallet:wallets:read', 'list of wallets/currencies'),
    ('private_wallet:purchases:read', 'list of purchases'),
    ('private_wallet:purchases:write', 'create purchase'),
    ('private_wallet:purchases:for_user:write', 'user by server user to create purchase for user'),
    ('private_wallet:subscriptions:read', 'list of active subscriptions'),

    ('user_migration:write', 'User migration between trees - PC worker need to have this permission'),
    
    ('virtual_shop:order:pc:write', 'Used to write status and status message'),
    ('virtual_shop:data_export:purchased:read', 'Used to Read history of purchased product for date'),
    ('virtual_shop:tag:write', 'Used to add/delete BaseTags')
)
