keytool -importkeystore -srckeystore argyll.keystore.jks -destkeystore hostname-keystore.p12 -deststoretype PKCS12 -srcalias localhost
openssl pkcs12 -in hostname-keystore.p12 -passin pass:<password> -nocerts -out argyll.key -passout pass:<password>
openssl pkcs12 -in hostname-keystore.p12  -nokeys -out argyll.pem

keytool -export -alias caroot -file argyll.crt -keystore client.truststore.jks