How to use
----------

cordova create green com.hm.green Grun
cordova platform add android
plugman install --platform android --project platforms/android --plugin /full/path/to/plugin/folder


Add to config.xml
<preference name="OverrideUserAgent" value="Mozilla/5.0 HIMEDIA" />

Add to index.html
<script type="text/javascript" src="cordova.js"></script>