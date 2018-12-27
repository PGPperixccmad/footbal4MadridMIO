/*
Interactive Showcase - Foosball Made With IBM

INDEX:
0. SETUP
0.1. Modules
0.2. Variables

1. CLOUDANT DATABASE ACCESS SETUP
2. MQTT - includes  main game logic. like goal handling.
3. DEFINITION of important functions
4. SETUP Middleware and express routes
*/

//0. SETUP
//0.1. Loading modules

var express = require('express');
var querystring = require('querystring');
var bodyParser = require('body-parser');
var extend = require('util')._extend;
var https = require('https');
var url = require('url');
var app = express();
var websocket_multiplex = require('websocket-multiplex');
var mqtt = require('mqtt');
var cfenv = require('cfenv');
var macUtil = require('getmac');
var path = require('path');
var properties = require('properties');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var _ = require('underscore');
var request = require('request');
var Twit = require('twit');
var clientdata = require('./clientdata');


var T = new Twit({
    consumer_key:         clientdata.twitter.consumer_key
  , consumer_secret:      clientdata.twitter.consumer_secret
  , access_token:         clientdata.twitter.access_token
  , access_token_secret:  clientdata.twitter.access_token_secret

    //test of moving to env variables_____________________
    /*

    consumer_key:         env['twitter'][0].credentials.consumer_key
  , consumer_secret:      env['twitter'][0].credentials.consumer_secret
  , access_token:         env['twitter'][0].credentials.access_token
  , access_token_secret:  env['twitter'][0].credentials.access_token_secret
    */
})

//Twitter Error Handler
function twithandleError(err) {
  console.error('response status:', err.statusCode);
  console.error('msg:', err);
}

//0.2. Definieren der globalen Variablen
var host = process.env.VCAP_APP_HOST || 'localhost';
//var host = process.env.VCAP_APP_HOST || '10.1.1.98';
var port = process.env.VCAP_APP_PORT || 8080;
var mqttHost = clientdata.mqttHost;
var mqttPort = clientdata.mqttPort;
var clientId = clientdata.iotClientId;

//test of moving to env variables_____________________
    /*
    var mqttHost = env['mqtt'][0].mqttHost;
    var mqttPort = env['mqtt'][0].mqttPort;
    var clientId = env['mqtt'][0].iotClientId;
    */

var savegoal;
var username;
var gameisopen = false;
//define timestamp buffer
var timestampbuffer = new Array();
timestampbuffer[0] = new Date("July 21, 1983 01:15:00");
//timestampbuffer[1] = new Date();
//timestampbuffer[3] = timestampbuffer[1] - timestampbuffer[0]
//console.log(timestampbuffer[0]+" "+ timestampbuffer[1] + " " + timestampbuffer[3]);
var red_user = "U.D. Client Center Madrid";
var blue_user = "Futbol Consultants Madrid";
var user_red_login = false;
var user_blue_login = false;

var globalGameID = 0;

//Define game class in order to store games in memory
function GameObject(location) {[
    this.gameID = null,
    this.userRed = null,
    this.userBlue = null,
    this.goalsRed = 0,
    this.goalsBlue = 0,
    this.location = location,
    this.timestamp = null,
    this.startTime = null,
    this.isActive = false
    ]};
var league = {
data: []
};
//Define league array object to save league player records
function leagueplayer() {[
            this.linkedinID = null,
            this.name = null,
            this.photo = null,
            this.company = null,
            this.goalsAndAgainstgoals = null,
            this.goaldif = null,
            this.wins = null,
            this.loses = null,
            this.points = null,
            this.games = null
        ]}


getcurrentTime = function(){
var thisdate = new Date();
var current_hour = thisdate.getHours();
var current_minutes = ('0'+thisdate.getMinutes()).slice(-2);
var current_time = current_hour + ":" + current_minutes;
return current_time;
}

//Create gameObjects for Ehningen or any other location
var gameEhningen = new GameObject(clientdata.location);

    //test of moving to env variables_____________________
    //var gameEhningen = new GameObject(env['location'][0].location);

console.log(gameEhningen);

//Define resultHandler
var resultHandler = function(resultStr){
    //console.log(resultStr);
}
//Define errorHandler
var errorHandler = function(errorMsg){
    console.error(errorMsg);
}

/*
//define eventMamager for Gamification
var evtManager = new restClient.EventManager(restConf);
*/

//1. CLOUDANT DATABASE ACCESS SETUP++++
//variable needed to insert into db when webserver is running on localhost.
var cloudant = {
		 		 //url : "https://75f08ef9-5ab8-491d-b1f8-a7fe6c758281-bluemix:2c240b40e81aa25c30a161c7b4278a7940900b89656cadcdfe2a422abc4c7c7a@75f08ef9-5ab8-491d-b1f8-a7fe6c758281-bluemix.cloudant.com"
         url : "https://7e3bbb8a-1c7c-4b50-83a0-e068f67c4f58-bluemix:077620e53182cf0469b1428ec6bbc11cadb99fb581a9267a7a3ba0d86480337e@7e3bbb8a-1c7c-4b50-83a0-e068f67c4f58-bluemix.cloudant.com"
};
//Check if there is a cloudant service binded and environment variables included
if (process.env.hasOwnProperty("VCAP_SERVICES")) {
  // Running on Bluemix. Parse out the port and host that we've been assigned.
  var env = JSON.parse(process.env.VCAP_SERVICES);
  host = process.env.VCAP_APP_HOST;
  port = process.env.VCAP_APP_PORT;

  console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);

  // Also parse out Cloudant settings.
  //FOR TESTING:
  //cloudant = env['user-provided'][0].credentials;
  //FOR LIVE VERSION:
  cloudant = env['cloudantNoSQLDB'][0].credentials;
}

//Load nano Module
var nano = require('nano')(cloudant.url);
var db = nano.db.use('games');
var twitterdb = nano.db.use('twitter');
//Require Custom Modules
var flatten = require('./flatten');

//###################################################### ###################################################### ######################################################
//###################################################### ###################### MQTT GOAL LOGIC #################### ######################################################
//###################################################### ###################################################### ######################################################

//###################################################### ###################### MQTT SETUP #################### ######################################################
//###################################################### ###################################################### ######################################################
//2. MQTT Communication including Game Logic and Goal handling +++++
//2.1. Get Keys to connect/authenticate with MQTT Broker aka Internet of Things Foundation
//Define Variables and get environment variables from Bluemix.


var appEnv = cfenv.getAppEnv();
var instanceId = !appEnv.isLocal ? appEnv.app.instance_id : undefined;
var iotService = appEnv.getService(clientdata.iotservice);

//Check if there are any environment variables for the Service in Bluemix. Otherwise use local config file for keys. Needed to test on localhost.
if(instanceId && iotService && iotService != null) {
    console.log('Instance Id: ' + instanceId);

    //Call start function, which is defined in 2.2.
    start(instanceId, iotService.credentials.apiKey, iotService.credentials.apiToken,iotService.credentials.mqtt_host, iotService.credentials.mqtt_s_port);
    } else {
    //If no environment variables are available, use local file config.properties to get authentification tokens
    properties.parse('./config.properties', {path: true}, function(err, cfg) {
            if (err) {
                console.error('A file named config.properties containing the device registration from the IBM IoT Cloud is missing.');
                console.error('The file must contain the following properties: apikey and apitoken.');
                throw e;
                }
            //Get Mac Adress and log into MQTT Broker
            macUtil.getMac(function(err, macAddress) {
                if (err) throw err;
                //Save Mac Adress as deviceID
                var deviceId = macAddress.replace(/:/gi, '');
                console.log("Device MAC Address: " + deviceId);
                var org = cfg.apikey.split('-')[1];
                //Connect to MQTT Broker via function start which is defined in 2.2. Include all parameters.
                start(deviceId, cfg.apikey, cfg.apitoken, org + '.messaging.internetofthings.ibmcloud.com','8883');
                });
        });
    }

//2.2. Function to connect to MQTT Broker aka Internet of Things Foundation. Handles incoming goals from Arduino. Saves them into db. Main Game logic is here.
function start(deviceId, apiKey, apiToken, mqttHost, mqttPort) {
    var org = apiKey.split('-')[1];
    var clientId = ['a', org, deviceId].join(':');

    var client = mqtt.connect("mqtts://" + mqttHost + ":" + mqttPort, {
    "clientId" : clientId,
    "keepalive" : 30,
    "username" : apiKey,
    "password" : apiToken
        });
console.log('mqtts://' + mqttHost + ':' + mqttPort + ' clientId:'+clientId + ' username:' + apiKey + ' password:' + apiToken  );
    //disable automatic reconnect
    client.options.reconnectPeriod = 1000;

    //handle successful connection to broker
    client.on('connect', function() {
        console.log('MQTT client connected to IBM IoT Cloud.');
        getGameID(function(maxGameID){
        globalGameID = maxGameID;
        console.log("GlobalGameID is: " + globalGameID );
      });
        //console.log(newGameID);
        });
    //handle error on connection to broker
    client.on('error', function(err) {
        console.error('client error' + err);
        });
    //handle disconnect to broker
    client.on('close', function() {
        console.log('client closed');
        });
    //handle reconnect on connection to broker
    client.on('reconnect', function(err) {
        console.error('reconnection happened');
        });
    //Subscribe to topic from IOT foundation to access data sent from arduino
     client.subscribe('iot-2/type/Raspberry/id/'+clientdata.arduinomac+'/evt/status/fmt/json-iotf',function(err,granted){
         console.log('subscription error' + err);
         console.log(granted);
     });

    //test of moving to env variables_____________________
    //client.subscribe('iot-2/type/Arduino/id/'+env[\'arduino\'][0].mac+'/evt/status/fmt/json');
    //control escapes \



//###################################################### ################### MQTT GOAL LOGIC ################## ######################################################
//###################################################### ###################################################### ######################################################
    //On incoming message from MQTT Broker on specific topic do check if game is open. If not, start game on own. Send goals to DB.

    client.on('message', function(topic,message){
        //define date for timestamp
        console.log(message.toString());
        str = message.toString();
        //console.log(json);
        var date = Date();
        //parse incoming goal from Arduino to JSON
        savegoal = JSON.parse(str);
        savegoal.d = JSON.parse(savegoal.d);
        //NEW Goal Check
        timestampbuffer[1] = new Date();
        //console.log("a. worked " + "1: " +  timestampbuffer[1] - timestampbuffer[0]);
        console.log("Savegoal Location: " + savegoal.d.Location);

        if(savegoal.d.Location != undefined){
        if( timestampbuffer[1] - timestampbuffer[0] > 3000){
            console.log("b. worked " + "1: " +  timestampbuffer[0] + "2: " + timestampbuffer[1]);
            timestampbuffer[0] = timestampbuffer[1];
            console.log(timestampbuffer[0]);
            //timestamp buffer
                    //define gameFile to store game information
                    var gameFile;
                    gameFile = gameEhningen;


                    console.log("Spiel ist offen?: " + gameFile.isActive);
                    //Check if game is already open. information is stored in JSON and locally.
                    if(!gameFile.isActive){
                            io.sockets.emit("newGameStarted");
                            //if no game is open create one
                            console.log("No game is running, open now");
                            console.log("Start startgame");
                            console.log("ID: " + globalGameID);
                            //gameFile.buBlue = "";
                            //gameFile.buRed = "";
                            gameFile.userBlueComp = "";
                            gameFile.userRedComp = "";
                            gameFile.userBluePhoto = "";
                            gameFile.userRedPhoto ="";
                            gameFile.userBlueHead = "";
                            gameFile.userRedHead = "";
                            gameFile.userRedID = "";
                            gameFile.userBlueID = "";
                            gameFile.goalsBlue = 0;
                            gameFile.goalsRed = 0;
                            gameFile.userRed = "U.D. Client Center Madrid";
                            gameFile.userBlue = "Futbol Consultants Madrid";
                            gameFile.isActive = true;
                            gameFile.startTime = Date();
                            gameFile.timestamp = Date();
                            //var newGameID = null;


                           // sendGameData(newGameID, function(newGameID){
                                    ++globalGameID;
                                    gameFile.gameID= globalGameID;
                                    console.log(gameFile);
                                    //uploadJSON(gameFile);
                                    storeGoals(gameFile, savegoal);
//                            });


                        } else {
                            //if game is open use gameID to store goal.
                            console.log("Got GameID & start insert");
                            console.log(savegoal);
                            //define color of goal scorer and send to uploader.
                            storeGoals(gameFile, savegoal);
                        }
                        //console.log("No game is opened");
                } else {console.log ("nope"); }
            } else {
                    console.log("ERR. Savegoal not defined: " + savegoal.d.Location)
                };
    });
};



//###################################################### ############# STORING GOALS FUNCTIONS ################ ######################################################
//###################################################### ###################################################### ######################################################
//3.1 DEFINITION OF storeGoals function
//define color of scorer and send to uploader
function storeGoals(gameFile, savegoal){

    //MS 16.04.2015 SPLIT NAME TO ONLY TWEET FIRSTNAME
    var nameRed = gameFile.userRed.split(' ');
    var nameBlue = gameFile.userBlue.split(' ');

    var shooter;
    //Check if team blue or red. Otherwise error.
    if(savegoal.d.Team == "red"){
            //increment goal for team red.
            gameFile.goalsRed++;
            //Shooter is user who scored goal. Player red.
            shooter = gameFile.userRed;
            //Tweet if there is a goal
            if(gameEhningen.goalsRed < 5) {
                T.post('statuses/update', { status: "Goooaaal for " + nameRed[0] + " against " + nameBlue[0] + "! New Score: " + gameEhningen.goalsRed + ":" + gameEhningen.goalsBlue + "! GameID: " + gameEhningen.gameID + " #IBM #Football4 #Play #Foosball" }, function(err, data, response) {
                if(err) return twithandleError(err);
                console.log("post for goal fired.");
                //console.log(data)
                });
            }
        }
    else if (savegoal.d.Team == "blue"){
            //increment goal for team blue.
            gameFile.goalsBlue++;
            //Shooter is user who scored goal. Player blue.
            shooter = gameFile.userBlue;
            //Tweet if there is a goal
            if(gameEhningen.goalsBlue < 5) {
                T.post('statuses/update', { status: "Goooaaal for " + nameBlue[0] + " against " + nameRed[0] + "! New Score: " + gameEhningen.goalsBlue + ":" + gameEhningen.goalsRed + "! GameID: " + gameEhningen.gameID +" #IBM #Football4 #Play #Foosball" }, function(err, data, response) {
                if(err) return twithandleError(err);
                console.log("post for goal fired.");
                //console.log(data)
                });
            }
        }
    else {
        console.log("Error: No team color");
    }

    var date = new Date(gameFile.timestamp);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var time = hours + ":" + minutes;
    console.log(time);

    //Send goal event to client including the score of both teams and the name of the scorer alias shooter
    io.sockets.emit("goal", { score_red: gameFile.goalsRed, score_blue: gameFile.goalsBlue, shooter: shooter, time: time});

    var won = false;

    if(gameFile.goalsRed == 5){
                //End game by setting key isActive in json to false
                gameFile.isActive = false;
                console.log(gameFile.userRed + " has won");
                won = true;

                //emit a winner event by socket.io and tell client that winner is user red.
                T.post('statuses/update', { status: "VICTORY. Player " + nameRed[0] + " wins for Team Red. Final Score: " + gameFile.goalsRed + ":" + gameFile.goalsBlue + "! GameID: " + gameEhningen.gameID +" #IBM #Football4 #WhyIloveIBM #Foosball" }, function(err, data, response) {
                if(err) return twithandleError(err);
                });

                io.sockets.emit("winner", {winner: gameFile.userRed, photo: gameFile.userRedPhoto, team: "red" });
            }

    if(gameFile.goalsBlue == 5){
                //team blue won
                //End game by setting key isActive in json to false
                gameFile.isActive = false;
                console.log(gameFile.userBlue+" has won");
                won =true;

                //emit a winner event by socket.io and tell client that winner is user blue.
                T.post('statuses/update', { status: "VICTORY. Player " + nameBlue[0] + " wins for Team Red. Final Score: " + gameFile.goalsBlue + " : " + gameFile.goalsRed + "! GameID: " + gameEhningen.gameID +" #IBM #Football4  #WhyIloveIBM #Foosball" }, function(err, data, response) {
                if(err) return twithandleError(err);
                });

                io.sockets.emit("winner", {winner: gameFile.userBlue, photo: gameFile.userBluePhoto, team: "blue"});
            }

    uploadJSON(gameFile);
    if(won){
        gameFile.goalsBlue = 0;
        gameFile.goalsRed = 0;
    }
}

//3.2. DEFINITION OF sendGameData function
//Rufe die Funktion zum Holen der SpielID auf und erhöhe diese anschließend um eins. Füge diese Wert dem GameSheet JSON hinzu.
//Call function to get GameID and increment it by one. Add this value to GameSheet JSON.
 function sendGameData(newGameID, callback){
    console.log("start inner loop");
     getGameID(function(maxGameID){
        var gameID = 0;
        gameID = maxGameID
        console.log("Save MaxGameID: " + gameID + typeof gameID);
        newGameID = ++gameID;
        console.log("Increment GameID: " + newGameID + typeof newGameID);
        console.log("GameID is: " + newGameID);
        //GameSheet.gameid = newGameID.toString();
        //console.log(GameSheet);
        callback(newGameID);
                    });
  };


//3.3. DEFINITION OF getGameID function
//Hole GameID aus Cloudant Datenbank und gib weiter per Callback.
//Get GameID from DB in cloudant. Give back as Callback.
function getGameID(callback){
    console.log("start getting GameID");
    //open up the specific view in cloudant, which includes all gameIDs.
    //db.view('showleague','showall',function(err, body) {
    db.view('getgameid','getgameid',function(err, body) {
        console.log("view initialised");
        //check if there is an error
        var maxGameID = 0;
        if (!err) {
            //Loop to get highest Game ID. If maxGameID is null, save the gameID value of the json document as maxGameID. Hint: every json document is one game.
            //body.rows.forEach(function(doc) {
                //Get highest gameID of view.
                maxGameID = parseInt(body.rows[0].value.max);
                //});
                console.log("Highest GameID is: " + maxGameID + typeof maxGameID);
                //Callback with maxGameID.
                callback (maxGameID);
            } else {
                 console.log("error getgameid: " + err);
            }
        });
}


//3.3. DEFINITION OF uploadJSON function
//get current timestamp and upload JSON to Cloudant
function uploadJSON(gameFile){
    //get Time stamp
    gameFile.timestamp = Date();
    JSON.stringify(gameFile);
    console.log(gameFile);
    //upload JSON
    db.insert(gameFile, function(err, body, header){
        if (!err) {
            console.log("Added new JSON");
            }
        else {
            console.log("Error inserting into DB " + err);
        }
    });
}





//###################################################### ###################################################### ######################################################
//###################################################### #################### SETUP MIDDLEWARE ################ ######################################################
//###################################################### ###################################################### ######################################################

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: 'a3dnaWnW3m§ö§m§iAmewQ3m§"!mQAiYUneYAei',
    cookie: { maxAge: 60000 },
    resave: true,
    saveUninitialized: false
}))
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');






//###################################################### ###################################################### ######################################################
//###################################################### ###################### EXPRESS ROUTES ################ ######################################################
//###################################################### ###################################################### ######################################################

// Render index page
app.get('/', function(req, res){
    res.render('pages/index');
});
// Render league global page
app.get('/league', function(req, res){
    res.render('pages/league');//, {
});
//Render league local page
app.get('/league_local', function(req, res){
    res.render('pages/league_local');
});

// Render liveticker page
app.get('/liveticker', function(req, res){
    res.render('pages/liveticker');
});

// Render login page
app.get('/mskickerlogin', function(req, res){
    res.render('pages/login');
});

//###################################################### ############## END GAME FUNCTIONALITY ################ ######################################################
//###################################################### ###################################################### ######################################################
app.get('/endGame',function(req,res) {
     io.sockets.emit("GameEnded");
    var location = req.query.location;
    gameFile = gameEhningen;

    //Check if game is still running
    if(gameFile.isActive){
        //set status of game to not running therefore false
        gameFile.isActive = false;
        //upload the game json
        uploadJSON(gameFile);
        //set score of both teams to null for next game
        gameFile.goalsBlue = 0;
        gameFile.goalsRed = 0;
        console.log("Game ended " + gameFile.isActive);
    } else{
        console.log("No game running");
        gameFile.goalsBlue = 0;
        gameFile.goalsRed = 0;
    }
    res.sendStatus(200);
});



//###################################################### ######################## SWITCH SIDES ################ ######################################################
//###################################################### ###################################################### ######################################################
app.get('/switchSides',function(req,res) {
    var location = req.query.location;
    //starts new game with switched sides, can be done during game too

    //select gameObject for location
    gameFile = gameEhningen;

    var gfBufferRed = new GameObject(clientdata.location);
    var gfBufferBlue = new GameObject(clientdata.location);

    //test of moving to env variables_____________________
    /*
    var gfBufferRed = new GameObject(env['location'][0].location);
    var gfBufferBlue = new GameObject(env['location'][0].location);
    */

    gfBufferRed.userRed = gameFile.userRed;
    gfBufferRed.userRedPhoto = gameFile.userRedPhoto;
    gfBufferRed.userRedID = gameFile.userRedID;
    gfBufferRed.userRedHead = gameFile.userRedHead;
    gfBufferRed.userRedComp = gameFile.userRedComp;
    //gfBufferRed.buRed = gameFile.buRed;

    gfBufferBlue.userBlue = gameFile.userBlue;
    gfBufferBlue.userBluePhoto = gameFile.userBluePhoto;
    gfBufferBlue.userBlueID = gameFile.userBlueID;
    gfBufferBlue.userBlueHead = gameFile.userBlueHead;
    gfBufferBlue.userBlueComp = gameFile.userBlueComp;
    //gfBufferRed.buBlue = gameFile.buBlue;

    gameFile.userRed = gfBufferBlue.userBlue;
    gameFile.userRedPhoto = gfBufferBlue.userBluePhoto;
    gameFile.userRedID = gfBufferBlue.userBlueID;
    gameFile.userRedHead = gfBufferBlue.userBlueHead;
    gameFile.userRedComp = gfBufferBlue.userBlueComp;
    //gameFile.buRed = gfBufferBlue.buBlue;

    gameFile.userBlue = gfBufferRed.userRed;
    gameFile.userBluePhoto = gfBufferRed.userRedPhoto;
    gameFile.userBlueID = gfBufferRed.userRedID;
    gameFile.userBlueHead = gfBufferRed.userRedHead;
    gameFile.userBlueComp = gfBufferRed.userRedComp;
    //gameFile.buBlue = gfBufferBlue.buRed;

    console.log("Start switched sides");
    gameFile.goalsBlue = 0;
    gameFile.goalsRed = 0;
    gameFile.isActive = true;
    gameFile.startTime = Date();
    gameFile.timestamp = Date();

    //Save GameID and upload game as JSON to DB.
    gameFile.gameID++;
    uploadJSON(gameFile);
    res.send(gameFile);
    io.sockets.emit("EventSwitchedSides", {userRed: gameFile.userRed, userRedPhoto: gameFile.userRedPhoto, userBlue: gameFile.userBlue, userBluePhoto: gameFile.userBluePhoto});
});


//###################################################### ######################## START GAME ################## ######################################################
//###################################################### ###################################################### ######################################################

//Eröffnen eines neuen Spiels mit Username der beiden Spieler, Lokation, Datum und GameID automatisch erhöht um eins. Speichere in Datenbank von Cloudant anschließend.
//Open up a new game with name of the both players, location and date. GameID is automatically incremented by one. Save in DB of Cloudant.


app.get('/startGame', function(req, res) {
    var location = req.query.location;

    //select gameObject for location
    gameFile = gameEhningen;

    //If no game is active/running then create new one
    if(!gameFile.isActive){
        console.log("Start startgame");
        console.log("ID: " + globalGameID);
        gameFile.goalsBlue = 0;
        gameFile.goalsRed = 0;
        gameFile.isActive = true;
        gameFile.startTime = Date();
        gameFile.timestamp = Date();
        var newGameID = null;
        //Send to liveticker
        io.sockets.emit("ClickedOnStartButton", {userRed: gameFile.userRed, userBlue: gameFile.userBlue});
        //Save GameID and upload game as JSON to DB.
       // sendGameData(newGameID, function(newGameID){
                ++globalGameID;
                gameFile.gameID= globalGameID;
                console.log(gameFile);
                uploadJSON(gameFile);
        //});
    } else{
        console.log("Game already running");
    }
    res.sendStatus(200);
});

////Send "gamestatus" using "isActive" key of game File to client in order to check if game is running.
app.get('/statuscheck', function(req, res) {
 var location = req.query.location;

    //select gameObject for location
    gameFile = gameEhningen;

    var result = {
        gameisopen: gameFile.isActive,
        userred: gameFile.userRed,
        userredphoto: gameFile.userRedPhoto,
        userblue: gameFile.userBlue,
        userbluephoto: gameFile.userBluePhoto
    }
    console.log("check game status is : " + gameFile.isActive);
    //send gamestatus to client.
    res.send(result);
})

app.get('/checkgamestatus_ajax', function(req, res) {
    var location = req.query.location;

    //select gameObject for location
    gameFile = gameEhningen;

    console.log("check game status is : " + gameFile.isActive);
    //send gamestatus to client.
    res.send(gameFile.isActive);
});





//###################################################### ###################################################### ######################################################
//###################################################### ####################### SOCKET EVENTS ################ ######################################################
//###################################################### ###################################################### ######################################################
//Require Socket.IO, Start The Server
var io = require('socket.io').listen(app.listen(port, host));
console.log('App started on port ' + port);

//Send data via User and League Event
io.sockets.on('connection', function(socket){
    //socket.emit('user', {'user': data.User});
    socket.emit('league', {'league': league});
    socket.emit('goal', { score_red: gameEhningen.goalsRed, score_blue: gameEhningen.goalsBlue});

    //Receiving player Data and uploading it
    socket.on('profileData', function(member){

        //console.log("user data received. Start upload to Cloudant");

        removeUnderscore(member);
        //console.log(member);

        // CHECK IF USER EXISTS
        location = clientdata.location; //workaround
        gameFile = gameEhningen;

        //test of moving to env variables_____________________
        /*
        var location = env['location'][0].location;
        */

        var userName =  (member.firstName +  " " + member.lastName);

        switch(member.color){
            case "red":
                gameFile.userRed = userName;
                gameFile.userRedPhoto = member.photo;
                gameFile.userRedID = member.id;
                gameFile.userRedHead = member.headline;
                if(member.positions !== undefined && member.positions.values !== undefined){
                    gameFile.userRedComp = member.positions.values[0].company.name;
                } else {
                    gameFile.userRedComp = "undefined";
                }
                //Send to liveticker userred
                io.sockets.emit("LoginPlayerRed", {userRed: gameFile.userRed, userRedPhoto: gameFile.userRedPhoto});

                //Tweet login player red
                T.post('statuses/update', { status: "New Player for Team Red! " + member.firstName + " logged in! Time: " + getcurrentTime() + " #IBM #Football4 #Play #Foosball" }, function(err, data, response) {
                     if(err) return twithandleError(err);
        });
                break;
            case "blue":
                gameFile.userBlue = userName;
                gameFile.userBluePhoto = member.photo;
                gameFile.userBlueID = member.id;
                gameFile.userBlueHead = member.headline;
                if(member.positions !== undefined && member.positions.values !== undefined){
                    gameFile.userBlueComp = member.positions.values[0].company.name;
                } else {
                    gameFile.userBlueComp = "undefined";
                }
                //Send to liveticker userred
                io.sockets.emit("LoginPlayerBlue", {userBlue: gameFile.userBlue, userBluePhoto: gameFile.userBluePhoto});

                //Tweet login player blue
                 T.post('statuses/update', { status: "New Player for Team Blue! " + member.firstName + " logged in! Time: "  + getcurrentTime() + " #IBM #Football4 #Play #Foosball"}, function(err, data, response) {
                    if(err) return twithandleError(err);
       });
                break;
        }


        var id;
        db.view('showleague','playerData', function(err,body){
            checkDoubles(err, body, member, function(id){
                //console.log("in callback");
                //console.log(id);
               db.destroy(id, function(err) {
                    if (!err)
                        console.log("destroyed");
                });
            });
        });

        //console.log(member);

        db.insert(member, function(err, body, header){
            if (!err) {
                console.log("Added user data");
                }
            else {
                console.log("Error inserting into DB " + err);
            }

        });



        //});

    });


    socket.on('account', function(data){
        session.uid=data;
    });

    //console.log("send initial score " + gameEhningen.goalsRed + " " + gameEhningen.goalsBlue);
});

//###################################################### ###################################################### ######################################################
//###################################################### ###### LINKEDIN USER DATA MANIPULATION ############### ######################################################
//###################################################### ###################################################### ######################################################

function checkDoubles(err, body,member, callback) {
            console.log("view initialised");
            var exists = false;
            //check if there is an error
            if (!err) {
                body.rows.forEach(function(doc) {
                    //loop through all rows
                    //console.log(doc.key);
                    //console.log("member");
                    //console.log(member.id);
                    if(parseInt(doc.key) == member.id)
                            //check if LinkedIn Id already in DB
                            exists = true;
                            id = doc.id;
                            //console.log("user already exists");
                            callback(id);
                            return exists;
                        });
                    return exists;
                } else {
                     console.log("error get linkedin id: " + err);
                }
        }


//remove all underscores in LinkedIn user data. Cloudant Sync from BI does not support them yet
function removeUnderscore(member){
    //console.log("start removing underscores");
    //console.log(member);
            _.each(_.allKeys(member), function(val, key){
                //use regex to check if underscore, replace with nothing
                if(val.match(/_/g)){
                    var valNew = val.replace(/_/g,"");
                    member[valNew] = member[val];
                    delete member[val];
                }
                if(_.isObject(member[val])){
                    //call recursive if a member is an object
                    removeUnderscore(member[val]);
                }

           });
    //console.log(member);
        }






//###################################################### ###################################################### ######################################################
//###################################################### ################# SEND LEAGUE - AJAX ################# ######################################################
//###################################################### ###################################################### ######################################################

//###### Global League

    app.get('/sendleague', function(req, res) {
        //call function to get data
        var design = clientdata.leagueDesign;
        var view = clientdata.leagueView;
        getLeaguefromDB(design, view, function () {
        //console.log('send the league_basic');
        //send array of objects named league to client via ajax
        res.send(league);
        league.data.length = 0;
        //console.log("empty league array");
        });
    });

//###### Local League

 app.get('/sendleague_local', function(req, res) {
        //call function to get data
        var design = clientdata.leagueDesign_local;
        var view = clientdata.leagueView_local;

        //test of moving to env variables_____________________
        /*
        var design = env['league'][0].leagueDesign;
        var view = env['league'][0].leagueView;
        */

        getLeaguefromDB(design, view, function () {
        //console.log('send the league_basic');
        //send array of objects named league to client via ajax
        res.send(league);
        league.data.length = 0;
        //console.log("empty league array");
        });
    });





//###################################################### ###################################################### ######################################################
//###################################################### #################### GET LEAGUE ###################### ######################################################
//###################################################### ###################################################### ######################################################

function getLeaguefromDB(design, view, callback){
    //console.log("start getting League");
    //open up the specific view in cloudant, which includes all player records
    db.view(design, view,{group: "true"},function(err, body) {
        //console.log("League-View initialised");
        //check if there is an error
        console.log(design + ", view "+  view)
        if (!err) {
            //Loop through the player records
            body.rows.forEach(function(doc) {
            //create new player record for league
            var player = new leagueplayer();
                player.linkedinID = doc.key[0];
                player.photo = '<img id="playerpic" src =' + doc.key[3] + ' onError="this.onerror=null; this.src=\'../images/default_player.png\' ;"></img>';
                player.name = doc.key[1];
                player.company = doc.key[2];
                player.games = doc.value[6];
                player.wins  = doc.value[3];
                player.loses  = doc.value[4];
                player.goalsAndAgainstgoals = doc.value[0] + ":" + doc.value[1];
                player.goaldif =doc.value[2];
                player.points  = doc.value[5];
                if(player.name != null & player.goaldif != null & player.name != "incognito" & player.name != "anonymous" ) {
                    //add player to league record
                    league.data.push(player);
                }

                    });
            //console.log("got league records");
            //if done getting league data from cloudant callback with string done
            callback("done");
            } else {
                 console.log("error getgameid: " + err);
            }
        });
}






//###################################################### ###################################################### ######################################################
//###################################################### #################### TWITTER FANS #################### ######################################################
//###################################################### ###################################################### ######################################################


//##### BEGIN TWITTER INIT AND TWEET LISTENING FOR STREAM
//var checkfansblue = T.stream('statuses/filter', { track: '#GoTeamBlue'});
//var checkfansred = T.stream('statuses/filter', { track: '#GoTeamRed'});

var checkfansblue = T.stream('statuses/filter', { track: '#UDCCMAD'});
var checkfansred = T.stream('statuses/filter', { track: '#FCMAD'});

checkfansblue.on('tweet', function (tweet) {
    console.log('blue');
    io.sockets.emit("tweetb", { tweet: tweet });
    twitterdb.insert(tweet, function(err, body, header){
        if (!err) {
            console.log("Added new Tweet Blue into DB");
            }
        else {
            console.log("Error inserting Tweet Blue into DB " + err);
        }
    });
});

checkfansred.on('tweet', function (tweet) {
    console.log('red');
    io.sockets.emit("tweetr", { tweet: tweet });
    twitterdb.insert(tweet, function(err, body, header){
        if (!err) {
            console.log("Added new Tweet Red into DB");
            }
        else {
            console.log("Error inserting Tweet Red into DB " + err);
        }
    });
});
//##### END TWITTER INIT AND TWEET LISTENING FOR STREAM






//###################################################### ###################################################### ######################################################
//###################################################### #################### PROBABILITY ##################### ######################################################
//###################################################### ###################################################### ######################################################

var wkBlue = new Array();
var wkGoalBlue;
var wkGoalRed;

//Send probability by ajax
app.get('/getWK', function(req, res) {
    console.log("Got request for wk");
    //send gamestatus to client.
    handleWkGoals(function(wkBlue){
         res.send(wkBlue);
    })
});

//Get all Goals and calculate probability of a goal event for each color
function getWkGoals(callback){
    db.view('wkeit','wkeitgoals',{group: "true",group_level: 1},function(err, body) {
        if(!err){
            sumallgames = body.rows[0].value + body.rows[1].value;
            wkGoalBlue = body.rows[0].value / sumallgames;
            wkGoalRed = body.rows[1].value / sumallgames;
            console.log("Success. Got wk vals: " + wkGoalRed + " " + wkGoalBlue );
            callback(wkGoalBlue,wkGoalRed);
        } else {
            console.log("Error getting wk total goals: " + err);
            }
    });
}

//create probability table
function handleWkGoals(callback){
    getWkGoals(function(wkGoalBlue,wkGoalRed){
        wkBlue[5] = new Array(1,1,1,1,1,1);
        for(var i = 4; i>=0;i--){
            wkBlue[i] = new Array(0,0,0,0,0,0);
        }

        wkBlue[4][4] = wkGoalBlue;


        for(var i = 3; i>=0;i--){
            index = i + 1;
            wkBlue[4][i] = wkGoalBlue*wkBlue[5][i] + wkGoalRed*wkBlue[4][index];
            wkBlue[i][4] = wkGoalBlue*wkBlue[index][4] + wkGoalRed*wkBlue[i][4];
        }

        for(var i = 3; i>=0;i--){
            index = i + 1;
            wkBlue[3][i] = wkGoalBlue*wkBlue[4][i] + wkGoalRed*wkBlue[3][index];
            wkBlue[2][i] = wkGoalBlue*wkBlue[3][i] + wkGoalRed*wkBlue[2][index];
            wkBlue[1][i] = wkGoalBlue*wkBlue[2][i] + wkGoalRed*wkBlue[1][index];
            wkBlue[0][i] = wkGoalBlue*wkBlue[1][i] + wkGoalRed*wkBlue[0][index];
        }
        console.log("callback that wkblue");
        callback(wkBlue);
});
};








//###################################################### ###################################################### ######################################################
//###################################################### #################### BACKUP ##################### ######################################################
//###################################################### ###################################################### ######################################################

//############################################################### DASHBOARD

//##########################################INDIVIDIUAL ANALYTICS

//#########################Start Get Nemesis
//Define list to save nemesis player inside
/*
var nemesislist = {
data: []
};

//Define Nemesis Player
function nemesisplayer() {[
            this.name = null,
            this.photo = null,
            this.points = null
        ]}

    app.get('/getNemesis', function(req, res) {
        //call function to get data
        console.log("got the call");
        getNemesisFromDB(function () {
        console.log('send the lnemesis');
        //send array of objects named league to client via ajax
        res.send(nemesislist);
        nemesislist.data.length = 0;
        //console.log("empty league array");
        });
    });


//GETTING LEAGUE RECORDS
function getNemesisFromDB(callback){
    //console.log("start getting League");
    //open up the specific view in cloudant, which includes all player records
    console.log("nemesis function started");
    console.log("session id: " + session.uid);
    db.view('individual','getnemesis',{group: "true", startkey: ['"' + session.uid + '"',""]},function(err, body) {
        console.log("Nemesis-View initialised");
        //check if there is an error
        if (!err) {
            //Loop through the player records
            body.rows.forEach(function(doc) {
            //create new player record for league
            console.log(doc.key[0] + '"' + session.uid + '"' + typeof session.uid + typeof doc.key[0])
            if(doc.value >= 0 && doc.key[0] ==  session.uid ) {
                    var nemesis = new nemesisplayer();
                    nemesis.name = doc.key[1];
                    nemesis.photo = doc.key[2];
                    nemesis.value = doc.value;
                    //add player to league record
                        nemesislist.data.push(nemesis);
                    console.log("drin und nemesislist:" + nemesislist);
                            }
            //console.log(nemesis);
                    });
            console.log("got nemesis records");
            //if done getting league data from cloudant callback with string done
            callback("done");
            } else {
                 console.log("error getgameid: " + err);
            }
        });
}
*/
//########################End Get Nemesis


/*
//Goals by color
    app.get('/goalsByColor', function(req, res) {


        var goalsCollection = {
            goals:
                {
                    //placeholder for teams timestamp
                    red:{
                        "1": {
                            goalsRed: 0,
                            timestamp: "Tue Mar 24 2015 10:33:19 GMT+0000 (UTC)"
                        }
                    },
                    blue:{
                        "1": {
                            goalsBlue: 0,
                            timestamp: "Tue Mar 24 2015 10:33:19 GMT+0000 (UTC)"
                        }
                    }
                }
        };

        var goalsArr = [[],[]];

        //call function to get data

        getGoalsByColorfromDB(goalsCollection, function () {
        var red = goalsCollection.goals.red;
        var blue = goalsCollection.goals.blue;
        var goalsRed =0;
        var goalsBlue =0;

        for (var key in red) {
            if (red.hasOwnProperty(key)) {
                //console.log(red[key]);
                var d = Date.parse(red[key].timestamp);
                goalsRed = goalsRed + red[key].goalsRed;
                goalsArr[0].push([d, goalsRed]);
            }
        }
        for (var key in blue) {
            if (blue.hasOwnProperty(key)) {
                var d = Date.parse(blue[key].timestamp);
                goalsBlue = goalsBlue + blue[key].goalsBlue;
                goalsArr[1].push([d, goalsBlue]);
            }
        }

        //console.log(goalsArr);
        res.send(goalsArr);
        league.data.length = 0;
        });
    });

//GETTING goals by color
function getGoalsByColorfromDB(goalsCollection, callback){
    //console.log("start getting League");
    //open up the specific view in cloudant, which includes all wins and their time


    db.view('showleague','export', function(err, body) {
        //console.log("League-View initialised");
        //check if there is an error


        JSON.stringify(goalsCollection);
        var inserted = false;
        if (!err) {
            //Loop through the player records
            console.log("starting to loop");
            body.rows.forEach(function(doc) {
                //console.log(doc);


                //check if gameID already exists
                //console.log(goalsCollection.goals);
                var gameID = doc.key.gameID;

                goalsCollection.goals.red[gameID] = {goalsRed:doc.key.goalsRed};
                //goalsCollection.goals.red.[gameID].goalsRed = doc.key.goalsRed;
                goalsCollection.goals.blue[gameID] = {goalsBlue:doc.key.goalsBlue};
                //goalsCollection.goals.blue.[gameID].goalsBlue = doc.key.goalsBlue;
                goalsCollection.goals.red[gameID].timestamp = doc.value;
                goalsCollection.goals.blue[gameID].timestamp = doc.value;

                //console.log(goalsCollection);
                //console.log(gameID);

            });
            //console.log(goalsCollection);
        callback("done");
        }else {
             console.log("error getgameid: " + err);
        }
        });
}
*/

/*
//League for Business Unit Challenge:
///Send league via ajax
    app.get('/sendleagueBU', function(req, res) {
        //call function to get data
        getLeagueBUfromDB(function () {
        //console.log('send the league_basic');
        //send array of objects named league to client via ajax
        res.send(league);
        league.data.length = 0;
        //console.log("empty league array");
        });
    });

//GETTING LEAGUE RECORDS
function getLeagueBUfromDB(callback){
    //console.log("start getting League");
    //open up the specific view in cloudant, which includes all player records
    db.view('showleague','getBU',{group: "true"},function(err, body) {
        //console.log("League-View initialised");
        //check if there is an error
        if (!err) {
            //Loop through the player records
            body.rows.forEach(function(doc) {
            //create new player record for league
            var player = new leagueplayer();
                player.BU = doc.key[0];
                player.games = doc.value[6];
                player.wins  = doc.value[3];
                player.loses  = doc.value[4];
                player.goalsAndAgainstgoals = doc.value[0] + ":" + doc.value[1];
                player.goaldif =doc.value[2];
                player.points  = doc.value[5];
                if(player.BU != null & player.goaldif != null) {
                    //add player to league record
                    league.data.push(player);
                }
            //console.log(player);
                    });
            //console.log("got league records");
            //if done getting league data from cloudant callback with string done
            callback("done");
            } else {
                 console.log("error getgameid: " + err);
            }
        });
}
*/
