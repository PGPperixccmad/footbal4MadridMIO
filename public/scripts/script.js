// ################### CONNECT TO SOCKET.IO
var socket = io.connect();

//############################## GET TIME
getcurrentTime = function(){
var thisdate = new Date();
var current_hour = thisdate.getHours();
var current_minutes = ('0'+thisdate.getMinutes()).slice(-2);
var current_time = current_hour + ":" + current_minutes;
return current_time;
}


//############################################ Login to LinkedIn
var selected = 1;
function onLinkedInLogin(){

}

function onLinkedInLoad() {
    IN.Event.on(IN, "auth", getProfileData);
}

function LinkedINAuth() {
	IN.UI.Authorize().place();
}

function hey() {
 	LinkedINAuth();
	IN.Event.on(IN, "auth", function () { onLinkedInLogin(); });
}

var userRed;
var userBlue;
var userRedPhoto;
var userBluePhoto;
var playersloggedin = 0;

//GET high resolution image from linkedin
function highRes(images){
    img = images.values[0];
    onSuccess();
}


var memberRed;
var memberBlue;
//GET Profile Data from LinkedIn Account
function onSuccess(data) {
    var member = data;
   	var id = member.id;
   	var firstName = member.firstName;
   	var lastName = member.lastName;
   	var photo;
    if(member.pictureUrls.values==undefined || member.pictureUrls.values ==null){
        photo = "../images/default_player.png";
    } else {
        photo = member.pictureUrls.values[0];
    }
   	var headline = member.headline;
    console.log(member);
    if(member.positions !== undefined && member.positions.values !== undefined) {
        var company = member.positions.values[0].company.name
        }
    else {
        company = "n/a";
    }

    if (selected == 1){
       // document.getElementById("selRed").disabled = false;
        $('#namered').html(firstName + ' ' + lastName);
        $('#iconred').hide();
        $("#imagered").attr('src',photo);
        $("#imagered").show();
        $('#LoginButtonRed').hide();
        memberRed = member;
        memberRed.color = "red";
        memberRed.photo = photo;
        userRed = (firstName +  " " + lastName);
        //console.log(userRed);
        userRedPhoto = photo;
        socket.emit('profileData', memberRed);
        //Moderator comment
        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge danger"><i class="fa fa-user-plus"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title"><b>' + userRed + '</b> logged in for Team Red! </h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +  getcurrentTime()  + '</small></p></div><div class="timeline-body"><p>This will be exciting. The Fans are anticipating a strong match. Show your support for Team Red: #GoTeamRed - and see what happens!</p></div></div></li></li>');
        document.getElementById("endGame").disabled = false;
        playersloggedin++;
    } else if (selected == 2) {
       // document.getElementById("selBlue").disabled = false;
        $('#nameblue').html(firstName + ' ' + lastName);
        $('#iconblue').hide();
        $("#imageblue").attr('src',photo);
        $("#imageblue").show();
        $('#LoginButtonBlue').hide();
        memberBlue = member;
        memberBlue.color = "blue";
        memberBlue.photo = photo;
        userBlue = (firstName + " " + lastName);
        userBluePhoto = photo;
        socket.emit('profileData', memberBlue);
        //Moderator comment
        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge primary"><i class="fa fa-user-plus"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title"><b>' + userBlue + '</b> logged in for Team Blue! </h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +  getcurrentTime()  + '</small></p></div><div class="timeline-body"><p>This will be exciting. The Fans are anticipating a strong match. Show your support for Team Blue: #GoTeamBlue - and see what happens!</p></div></div></li></li>');
        document.getElementById("endGame").disabled = false;
        playersloggedin++;
    }

    //If both players are logged in, give possibility to start game
    if(playersloggedin == 2) {

       document.getElementById("startGame").disabled = false;
       $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge info"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Both Teams are logged in. Press "START GAME" to begin! FIVE Goals needed to win!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p><b>'+ userRed + '</b> for Team Red against<b>' + userBlue +'</b> for Team Blue. We hope for an exciting game. Support your team with #GoTeamRed or #GoTeamBlue</p></div></div></li></li>');

       /*
        $('#ticker').prepend("<div class='well'><p><i class='fa fa-bell'></i> Beide Teams sind vollständig. Es spielen " + userRed + " für Team Rot und " + userBlue + " für Team Blau gegeneinander. Vergessen Sie nicht Ihre Teams mit #GoTeamRed und #GoTeamBlue anzufeuern! Via dem Start Game-Button können Sie die Partie beginnen!</p></div>");
        */
        playersloggedin = 0;
    }

    //Log out of LinkedIn
    IN.User.logout();
}

function onError(error) {
    console.log(error);
}

function getProfileData() {
     IN.API.Raw("/people/~:(id,firstName,lastName,location,industry,picture-urls::(original),headline,positions:(is-current,company:(name)))").result(onSuccess).error(onError);
}


$(document).ready(function(){
     $("#imagered").hide();
     $("#imageblue").hide();

    $("#LoginButtonRed").click(function(){
        hey();
        selected = 1;
    });

    $("#LoginButtonBlue").click(function(){
        hey();
        selected = 2;
    });
});




//############################################ Start and End Game
//variable to check if game is open
    var gameisopen;
//variable for probability
    var wkblue;

//JQUERY: on document ready load the functions
$(document).ready(function(){

document.getElementById("startGame").disabled = true;
document.getElementById("endGame").disabled = true;
document.getElementById("switchSides").disabled = true;
//$(".wkval").hide();
//document.getElementById("selRed").disabled = true;
//document.getElementById("selBlue").disabled = true;


//########################### WK INIT LOAD DATA
$.get('/getWK',function(res){
    wkblue = res;
});

$.get('/statuscheck',{location:'ehningen'} , function(res) {
    //console.log(res.gameisopen);
    gameisopen = res.gameisopen;
    if(gameisopen){
        document.getElementById("endGame").disabled = false;
            console.log("here" + res.userred + res.userblue);
            $('#namered').html(res.userred);
            $('#iconred').hide();
            $("#imagered").attr('src',res.userredphoto);
            $("#imagered").show();
            $('#LoginButtonRed').hide();
            $('#nameblue').html(res.userblue);
            $('#iconblue').hide();
            $("#imageblue").attr('src',res.userbluephoto);
            $("#imageblue").show();
            $('#LoginButtonBlue').hide();

        if(res.userred == "incognito" || res.userred == "anonymous" ){
            $('#iconred').show();
            $("#imagered").hide();
            $('#LoginButtonRed').show();
        }
        if(res.userblue == "anonymous" || res.userblue == "incognito"){
            $('#iconblue').show();
            $("#imageblue").hide();
            $('#LoginButtonBlue').show();
        }

    } else {
        score_red.innerHTML = "- ";
        score_blue.innerHTML = " -";
        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge success"><i class="fa fa-cloud"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">No Game running.</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p>Be the one to win at Football 4.0. Login with LinkedIn to play!</p></div></div></li></li>');

    }
    });

    //Function to check if is game open. In case no game is open start one.
    $('#startGame').click(function(){
        document.getElementById("endGame").disabled = false;
        document.getElementById("switchSides").disabled = false;
        $.get('/checkgamestatus_ajax',{location:'ehningen'} , function(res) {
            //Save result of client if game is open into gameisopen variable of client.
            gameisopen = res;
            //if no game is open do functionality for starting game
            if(!gameisopen){
                //date for timestamp
                date = Date();
                //send startGame event to server.
                document.getElementById("startGame").disabled = true;
                $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge success"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">The Game has Started! Enjoy!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> This game is interesting. Both players are very talented. Who will win?<b>'+ userRed + '</b> for Team Red or <b>' + userBlue +'</b> for Team Blue? Let us find out!</p></div></div></li></li>');

                $.get('/startGame',{location:'ehningen'}, function(){
                score_red.innerHTML = "0 ";
                score_blue.innerHTML = " 0";
                    });
                };
            });
            //show Wkeit
            $('#wkblue').html((wkblue[0][0]*100).toFixed(1)+ "%");
            $('#wkred').html(((1-wkblue[0][0])*100).toFixed(1)+ "%");
            $('.wkval').show();
    });

    //Function to end game.
    $('#endGame').click(function(){
        document.getElementById("switchSides").disabled = true;
        document.getElementById("endGame").disabled = true;
        document.getElementById("startGame").disabled = true;
        $(".wkval").hide();

        //show incognito as player for team red
        $('#namered').html("Player A");
        $('#iconred').show();
        $("#imagered").hide();
        $('#LoginButtonRed').show();
        userRed = "Player A";
        memberRed = null;

        //show anonymous as player for team blue
        $('#nameblue').html("Player B");
        $('#iconblue').show();
        $("#imageblue").hide();
        $('#LoginButtonBlue').show();
        userRed = "Player B";
        memberBlue = null;

        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Game ended. The Game is over!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> Login again to start a new game.</p></div></div></li></li>');

        score_red.innerHTML = "- ";
        score_blue.innerHTML = " -";
        $.get('/endGame',{location:'ehningen'} ,function(){
                    });
         $.get('/getWK', function(res){
            console.log("wk update event fired");
            wkblue = res;
            });
        });

    $('#switchSides').click(function(){
        document.getElementById("endGame").disabled = false;
        $(".wkval").hide();
        document.getElementById("startGame").disabled = true;
        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Switched Sides. Started Rematch! Enjoy your game!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> Players switched sides. We are ready. Let us look at the players. <b>'+ userRed + '</b> plays for Team Red and <b>' + userBlue +'</b> for Team Blue. Let us find out!</p></div></div></li></li>');


        $.get('/switchSides',{location:'ehningen'}, function(res){
            //update frontend with switched sides
            var gameFile = res;
            $('#namered').html(gameFile.userRed);
            $("#imagered").attr('src', gameFile.userRedPhoto);
            $('#nameblue').html(gameFile.userBlue);
            $("#imageblue").attr('src', gameFile.userBluePhoto);
            score_red.innerHTML = 0;
            score_blue.innerHTML = 0;
        });

    //Reload on startgame without start button
        socket.on("GameEnded", function(){
            location.reload();
        });
    });

//Reset page when game is started without linkedin users logged in
socket.on("newGameStarted", function(){
    function reloadpage() {
        location.reload();callback();
    }
    function allowbutton(){
        document.getElementById("endGame").disabled = false;
    }
    allowbutton(reloadpage);
    $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Caution: Anonymous game ongoing! No progess will be saved for the league table. </h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +  getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> Log in with LinkedIn in order to to save your progress for the league table. Compete with the best! </p></div></div></li></li>');
    /*
    $('#ticker').prepend("<div class='well'><p><i class='fa fa-futbol-o'></i> Anonymes Spiel hat begonnen.</p></div>");
    */
});



//############################################ EVENTS | LIVETICKER
//Function to show Livescore and Liveticker.

    //get correct divs to show score
    var score_red = document.getElementById("goal_red");
    var score_blue = document.getElementById("goal_blue");

    //var ticker = document.getElementById("ticker");
    console.log("Listen for Goal event");
    console.log("hello world");


//################################# LISTEN FOR GOAL EVENT. HAPPENS ON SOCKET CONNECT AND GOAL SCORED.
    socket.on('goal', function (data) {

            console.log("Insert Score into HTML");
            //Insert score for red and blue into html.

            score_red.innerHTML = data.score_red;
            score_blue.innerHTML = data.score_blue;

            //Part for Liveticker: Add new div with Time and Score
            if(data.shooter != undefined) {
            document.getElementById("endGame").disabled = false;
            $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="fa fa-futbol-o fa-lg"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Gooaaaaaal for <b>'+ data.shooter +'</b>. New score: '+ data.score_red +' : '+ data.score_blue +'</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> This is a great match.</p></div></div></li></li>');
            /*
            $('#ticker').prepend("<div class='well'><p><i class='fa fa-futbol-o'></i> " + data.time +" Uhr | Tor für "+ data.shooter +" | Ergebnis: " + data.score_red + " : " + data.score_blue + "</p></div>");
            */
            };

            //Show Wkeit
            if (wkblue == null) {
            console.log("wk is undefined");
            } else {
            $('#wkblue').html((wkblue[data.score_blue][data.score_red]*100).toFixed(1)+ "%");
            $('#wkred').html(((1-wkblue[data.score_blue][data.score_red])*100).toFixed(1)+ "%");
            if(gameisopen){
                $('.wkval').show();
                }
            }

    });

//################################# WINNER EVENT

    socket.on('winner', function(data) {
            //Alert Function and liveticker insert.
            //alert(data.winner + ' has won! Congratulations!');
            $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">The Game is over! <b>'+ data.winner +'</b> has won. Final score: '+ document.getElementById("goal_red").innerHTML +' : '+ document.getElementById("goal_blue").innerHTML +'</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> This is a great match.</p></div></div></li></li>');

            /*
            $('#ticker').prepend("<div class='well'><p><i class='fa fa-trophy'></i> 16:00 Uhr | " + data.winner + " hat gewonnen | Endstand: " + document.getElementById("goal_red").innerHTML + " : " + document.getElementById("goal_blue").innerHTML + "</p></div>");
        */
        if(data.winner == "anonymous" || data.winner == "incognito"){
        }else {
            $('#myModal').modal('show');
            $('.winnerplayer').text("Congratulations, " + data.winner + " has won. Great Game!");
            $('.modal_playerwin img').attr('src', data.photo);
        }
        });


//################################## TWEET HANDLING
     socket.on("tweetr", function(data){
            console.log("tweetr received");
            $('.timeline').prepend('<li><div class="timeline-badge twitter"><i class="fa fa-twitter fa-lg"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Tweet for U.D. Client Center Madrid!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p><b> @' + data.tweet.user.screen_name + '</b>: "' + data.tweet.text + '"</p></div></div></li>');
        });

     socket.on("tweetb", function(data){
            console.log("tweetb received");
            $('.timeline').prepend('<li><div class="timeline-badge twitter"><i class="fa fa-twitter fa-lg"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Tweet for Futbol Consultants Madrid!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p><b> @' + data.tweet.user.screen_name + '</b>: "' + data.tweet.text + '"</p></div></div></li>');
        });



});

//################################# REMATCH MODAL
$('#rematch').click(function(){
        $(".wkval").hide();
        document.getElementById("endGame").disabled = false;
        document.getElementById("startGame").disabled = true;
        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Remtach! Switched Sides. Started Game. You can play now! </h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p><b>' + userRed + '</b> for Team Red and <b>' + userBlue + '</b> for Team Blue!</p></div></div></li></li>');
    /*
                    $('#ticker').prepend("<div class='well'><p><i class='fa fa-chevron-up'></i> | Seitenwechsel: Auf ein Rückspiel der Königsklasse!.</p></div>");
*/
        $.get('/switchSides',{location:'ehningen'}, function(res){
            //update frontend with switched sides
            var gameFile = res;
            $('#namered').html(gameFile.userRed);
            $("#imagered").attr('src', gameFile.userRedPhoto);
            $('#nameblue').html(gameFile.userBlue);
            $("#imageblue").attr('src', gameFile.userBluePhoto);
            score_red.innerHTML = 0;
            score_blue.innerHTML = 0;
        });
    // Hide modal after click
    $('#myModal').modal('hide');
    //Reload on startgame without start button
        socket.on("GameEnded", function(){
            location.reload();
        });
    $.get('/getWK',function(res){
    wkblue = res;
    });
    $(".wkval").show();
    });
