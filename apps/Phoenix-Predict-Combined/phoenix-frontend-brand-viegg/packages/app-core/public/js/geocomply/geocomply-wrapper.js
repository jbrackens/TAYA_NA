// File is for distribution only to intended or authorized recipients.
// © GeoComply Inc. 2015. All rights reserved.
// GeoComply Web SDK Integration Example
// Javascript file distributed with GeoComply Web SDK Client library.

GCWrapper = (function() {
    var settings = {
            // Specify your Player Location Check installer id provided by GeoComply.
            installerID: 'pwx5OPfLhV',

            //Specify your environment id here, it can be either staging or production
            envId: 'staging',

            // PUT YOUR LICENSE HERE
            license: '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',
            // Specifies the id of a user logged into your app. The id is
            // associated with the geolocation result. The user id is shown
            // in geolocation transaction report in GeoComply Back Office
            // site.
            userId: '1234',

            // Specifies the reason for geolocation. E.g. Login, Deposit,
            // Wager, Withdraw, etc. The reason is shown in geolocation
            // transaction report in GeoComply Back Office site.
            reason: 'LOGIN',

            // Set mandatory custom fields
            customFields: {
                sessionKey: 'Your SessionKey'
            }
        };

    function initUI() {
        // document.getElementsByClassName('page-title').item(0).innerHTML += ' (' + GeoComply.Client.getJSLibraryVersion() + ')';
        // disableButtons(true);

        // GeoComply.Events
        //     .add(document.getElementById('btn-connect'), 'click', connect)
        //     .add(document.getElementById('btn-disconnect'), 'click', disconnect)
        //     .add(document.getElementById('btn-request'), 'click', triggerGeolocation)
        //     .add(document.getElementById('btn-clear-log'), 'click', clearLog);

        init();
    }

    function disableButtons(state) {
        // document.getElementById('btn-connect').disabled = !state;
        // document.getElementById('btn-disconnect').disabled = state;
        // document.getElementById('btn-request').disabled = state;
    }

    function init() {
        connect()

    //     GeoComply.Client.on('connect', function() {
    //         logMessage('GeoComply Client connected');
    //         disableButtons(false);

    //         GeoComply.Client
    //         .setLicense(settings.license)
    //         .setGeolocationReason(settings.reason)
    //         .setUserId(settings.userId);

    //         // document.getElementById('version').innerHTML = GeoComply.Client.getVersion();
    //         // //document.getElementById('btn-connect').disabled = true;
    //         // document.getElementById('connection-status').innerHTML = 'Connected';
    //     }).on('error', function(errorCode, errorMessage) {
    //         switch (errorCode) {
    //             case GeoComply.Client.CLNT_ERROR_LOCAL_SERVICE_COMMUNICATION:
    //                 disableButtons(true);
    //                 //document.getElementById('btn-connect').disabled = false;
    //                 logMessage('Connection to GeoComply Client failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');
    //                 break;
    //             case GeoComply.Client.CLNT_ERROR_LOCAL_SERVICE_UNSUP_VER:
    //                 disableButtons(true);
    //                 //document.getElementById('btn-connect').disabled = false;
    //                 logMessage('Connection to GeoComply Client failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');
    //                 break;
    //             case GeoComply.Client.CLNT_ERROR_LOCAL_SERVICE_UNAVAILABLE:
    //                 disableButtons(true);
    //                 //document.getElementById('btn-connect').disabled = false;
    //                 logMessage('Connection to GeoComply Client failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');

    //                 // If this event handler is called, most probably Player Location Check Service
    //                 // is not installed. The handler downloads and install Player Location Check service.
    //                 if (navigator.appVersion.indexOf('Win') !== -1) {
    //                     window.open('https://stg-ums.geocomply.net/installer/url?id=' + settings.installerID + '&os=win&version=' + '3.1.1.3', '_self');
    //                 } else if (navigator.appVersion.indexOf('Mac') !== -1) {
    //                     window.open('https://stg-ums.geocomply.net/installer/url?id=' + settings.installerID + '&os=mac&version=' + '3.1.1.3', '_self');
    //                 }

    //                 break;
    //             case GeoComply.Client.CLNT_ERROR_TRANSACTION_TIMEOUT:
    //                 disableButtons(true);
    //                 //document.getElementById('btn-connect').disabled = false;
    //                 logMessage('Connection to GeoComply Client failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');

    //                 break;
    //             // Missing required parameters
    //             case GeoComply.Client.CLNT_ERROR_WRONG_OR_MISSING_PARAMETER:
    //                 disableButtons(true);
    //                 //document.getElementById('btn-connect').disabled = false;
    //                 logMessage('GeoLocation failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');
    //                 break;
    //             case GeoComply.Client.CLNT_ERROR_LICENSE_EXPIRED:
    //             case GeoComply.Client.CLNT_ERROR_INVALID_LICENSE_FORMAT:
    //                 logMessage('GeoLocation failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');
    //                 break;
    //             case GeoComply.Client.CLNT_ERROR_SERVER_COMMUNICATION:
    //                 disableButtons(false);
    //                 logMessage('GeoLocation failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');
    //                 break;
    //             default:
    //                 disableButtons(false);
    //                 logMessage('GeoLocation failed. Details: ErrCode=[' + errorCode + ']; ErrMessage=[' + errorMessage + ']');
    //                 break;
    //         }
    //     }).on('geolocation', function(data) {
    //         // Process geolocation data here  
    //         logMessage("GeoPacket created:\r\n" + data);
    //     }).on('log', logMessage);
    }

    function connect() {
        //document.getElementById('btn-connect').disabled = true;


        // Connect to Player Location Check service.
        GeoComply.Client.connect(settings.installerID, settings.envId);
    }

    function disconnect() {
        disableButtons(true);
        //document.getElementById('btn-connect').disabled = false;

        // Discinnects from Player Location Check and release the resources.
        GeoComply.Client.disconnect();

        logMessage('GeoComply Client disconnected');
        // document.getElementById('connection-status').innerHTML = 'Disconnected';
    }

    function triggerGeolocation() {
        logMessage('Geolocation request started');

        // Set License and geolocation parameters
        GeoComply.Client
            .setLicense(settings.license)
            .setGeolocationReason(settings.reason)
            .setUserId(settings.userId);

        // Set custom field.
        GeoComply.Client.customFields.set('session_key', settings.customFields.sessionKey);

        // Trigger a process to get geolocation data. When geolocation
        // data are available onGeolocationAvailable() event is fired.
        GeoComply.Client.requestGeolocation();
    }

    function logMessage(msg) {
console.log({geomsg: msg});
    }



    GeoComply.Events.ready(window, initUI);


    window.addEventListener('beforeunload', function(e) {
        GeoComply.Client.disconnect();
    })


    return {};
}());
