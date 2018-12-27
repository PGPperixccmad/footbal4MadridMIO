var clientdata = {};
//#############################################################################################################################
//###################################################    TEAM COLORS    #######################################################
//#############################################################################################################################
//RED IS WHITE   | Arduino input slot: A0
//BLACK IS BLUE | Arduino input slot: A2


//#############################################################################################################################
//####################################################    TWITTER     #########################################################
//#############################################################################################################################
//Data for Twitter Account to be used to tweet scores.
clientdata.twitter =
    {consumer_key:         'PoO37OA5Y3LfCHqBUsecWwO86',
     consumer_secret:      'w4p2JC2rqNfRIiPstwdkxuP9xo1LEE7e5zyfNd13UzALb6QOKV',
     access_token:         '951048301675270144-pjuvQVBLu1YArB8xylVZPhMFsHmqlLh',
     access_token_secret:  'RPAy7ZHKpkXHAYGsnVCKoW75cW7eN1cJ3URmrxPDLeGHF'
    };

//#############################################################################################################################
//####################################################    LINKED IN    ########################################################
//#############################################################################################################################
//Client ID/API Key for LinkedIn Authentification App
//EDIT IN views/pages/LOGIN.EJS


//#############################################################################################################################
//####################################################    ARDUINO DATA     ####################################################
//#############################################################################################################################
//Define MAC of arduino
    clientdata.arduinomac = "B827EBB1786B";
//Define location of arduino for app
    clientdata.location = "madrid";

//#############################################################################################################################
//####################################################    IOT FOUNDATION    ######################################################
//#############################################################################################################################

//for old environment use:
    //clientdata.mqttHost = 'jjkd9j.messaging.internetofthings.ibmcloud.com';
    //clientdata.mqttPort = '8883';
    //clientdata.iotClientId = 'a:jjkd9j:a-jjkd9j-0oovw8sut3';

//for development use:
    //clientdata.mqttHost = 'zv0oy3.messaging.internetofthings.ibmcloud.com';
    //clientdata.mqttPort = '8883';
    //clientdata.iotClientId = 'a:zv0oy3:a-zv0oy3-jtmjmpgju9';

//for Live version use:
/*    clientdata.mqttHost = '8nloc4.messaging.internetofthings.ibmcloud.com';
    clientdata.mqttPort = '8883';
    clientdata.iotClientId = 'a:8nloc4:a-8nloc4-tcxpmucwa0';
    clientdata.iotservice = 'IoT_all2';*/

    clientdata.mqttHost = '4yluom.messaging.internetofthings.ibmcloud.com';
    clientdata.mqttPort = '8883';
    clientdata.iotClientId = 'a:4yluom:a-4yluom-jdjucs1cpx';
    clientdata.iotservice = 'IoT_allMIO';

//#############################################################################################################################
//####################################################    LEAGUE VIEW    ######################################################
//#############################################################################################################################
//Define which global view to use for GLOBAL view
    clientdata.leagueDesign = 'showleague';
    clientdata.leagueView = 'league_global';

//Define which league view to use for LOCAL view
    clientdata.leagueDesign_local = 'showleague';
    clientdata.leagueView_local = 'league_madrid';



module.exports = clientdata;
