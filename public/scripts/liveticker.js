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

//*************************** PLAY SOUND
function sound(src) {
  this.sound = document.createElement("audio");
  this.sound.src = src;
  this.sound.setAttribute("preload", "auto");
  this.sound.setAttribute("controls", "none");
  this.sound.style.display = "none";
  document.body.appendChild(this.sound);
  this.play = function(){
    this.sound.play();
  }
  this.stop = function(){
    this.sound.pause();
  }
}



//############################################ Start and End Game

//JQUERY: on document ready load the functions
$(document).ready(function(){
    //Declare User Variables
    var userRed;
    var userBlue;
    var userRedPhoto;
    var userBluePhoto;
    //declare variable to check if game is open
    var gameisopen;
    //declare ariable for probability
    var wkblue;
    //Hide WK on INIT
    $('.wkval').hide();
    $("#imagered").hide();
    $("#imageblue").hide();

    //**** Declare variable for sound effect

    var mySound = new sound("./sounds/gol.wav");


$.get('/statuscheck',{location:'ehningen'} , function(res) {
    //console.log(res.gameisopen);
    gameisopen = res.gameisopen;
    if(gameisopen){
        if(res.userred != "anonymous" || res.userblue != "incognito"){
            $('#namered').html(res.userred);
            $('#iconred').hide();
            $("#imagered").attr('src',res.userredphoto);
            $("#imagered").show();
            $('#nameblue').html(res.userblue);
            $('#iconblue').hide();
            $("#imageblue").attr('src',res.userbluephoto);
            $("#imageblue").show();
        }
        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge success"><i class="fa fa-cloud"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Game is running!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p>Player for Team Red is <b>'+res.userred + '</b> who plays against '+ res.userblue +' of Team Blue!</p></div></div></li></li>');
            score_red.innerHTML = res.goalsRed;
            score_blue.innerHTML = res.goalsBlue;
    } else {
        score_red.innerHTML = "- ";
        score_blue.innerHTML = " -";
        $("#imageblue").hide();
        $("#imagered").hide();
        $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge success"><i class="fa fa-cloud"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">No Game running.</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p>Be the one to win at Football 4.0. Login with LinkedIn to play!</p></div></div></li></li>');

    }
    });


//############################################ Reset page when game is started without linkedin users logged in
socket.on("newGameStarted", function(){
    $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Caution: Anonymous game ongoing! No progess will be saved for the league table. </h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +  getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> Log in with LinkedIn in order to to save your progress for the league table. Compete with the best! </p></div></div></li></li>');
});

//############################################ EVENTS | LIVETICKER
//Function to show Livescore and Liveticker.

    //get correct divs to show score
    var score_red = document.getElementById("goal_red");
    var score_blue = document.getElementById("goal_blue");

    //var ticker = document.getElementById("ticker");
    console.log("Listen for Goal event");
    //add active class to highlight current site
    $('a[href="' + this.location.pathname + '"]').addClass('active');
//################################# LISTEN FOR GOAL EVENT. HAPPENS ON SOCKET CONNECT AND GOAL SCORED.
    socket.on('goal', function (data) {

            // Play sound goal
            //mySound.play();

            //Insert score for red and blue into html.
            resultred = data.score_red;
            resultblue = data.score_blue;
            score_red.innerHTML = data.score_red;
            score_blue.innerHTML = data.score_blue;

            //########################### WK INIT LOAD DATA
            $.get('/getWK',function(res){
                wkblue = res;
                //console.log(res);
                if (wkblue != null) {
                    console.log("fire: " + gameisopen);
                    $('#wkblue').html((wkblue[data.score_blue][data.score_red]*100).toFixed(1)+ "%");
                    $('#wkred').html(((1-wkblue[data.score_blue][data.score_red])*100).toFixed(1)+ "%");
                    if(gameisopen){
                        $('.wkval').show();
                    }
                }
            });
            //Part for Liveticker: Add new div with Time and Score
            if(data.shooter != undefined) {
            //document.getElementById("endGame").disabled = false;
            $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="fa fa-futbol-o fa-lg"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Gooaaaaaal for <b>'+ data.shooter +'</b>. New score: '+ data.score_red +' : '+ data.score_blue +'</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> This is a great match.</p></div></div></li></li>');
            };
    });

//################################# WINNER EVENT

    socket.on('winner', function(data) {
            //Liveticker insert.
            $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">The Game is over! <b>'+ data.winner +'</b> has won. Final score: '+ document.getElementById("goal_red").innerHTML +' : '+ document.getElementById("goal_blue").innerHTML +'</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> This is a great match.</p></div></div></li></li>');
        });


//################################## TWEET HANDLING
     socket.on("tweetr", function(data){
            console.log("tweetr received");
            $('.timeline').prepend('<li><div class="timeline-badge twitter"><i class="fa fa-twitter fa-lg"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Tweet for Team Red!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p><b> @' + data.tweet.user.screen_name + '</b>: "' + data.tweet.text + '"</p></div></div></li>');
        });

     socket.on("tweetb", function(data){
            console.log("tweetb received");
            $('.timeline').prepend('<li><div class="timeline-badge twitter"><i class="fa fa-twitter fa-lg"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Tweet for Team Blue!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p><b> @' + data.tweet.user.screen_name + '</b>: "' + data.tweet.text + '"</p></div></div></li>');
        });

//############################### GAME ENDED
    socket.on("GameEnded", function(){
            $(".wkval").hide();

            //show incognito as player for team red
            $('#namered').html("Player A");
            $('#iconred').show();
            $("#imagered").hide();
            $('#LoginButtonRed').show();
            userRed = "Player A";

            //show anonymous as player for team blue
            $('#nameblue').html("Player B");
            $('#iconblue').show();
            $("#imageblue").hide();
            $('#LoginButtonBlue').show();
            userRed = "Player B";

            //Reset Goal
            score_red.innerHTML = "- ";
            score_blue.innerHTML = " -";

            //WK Update Event
            $.get('/getWK', function(res){
            console.log("wk update event fired");
            wkblue = res;
            });

            //Comment on Liveticker
            $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Game ended. The Game is over!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> Login again to start a new game.</p></div></div></li></li>');
        })

//############################### CLICKED ON START BUTTON
  socket.on("ClickedOnStartButton", function(data){
            $('.wkval').show();
         $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge success"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">The Game has Started! Enjoy!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> This game will be exciting. Both players are very talented. Who will win? <b>'+ userRed + '</b> for Team Red or <b>' + userBlue +'</b>  for Team Blue? Let us find out!</p></div></div></li></li>');
        })

//############################### LOGIN PLAYER RED
  socket.on("LoginPlayerRed", function(data){
            userRed = data.userRed;
            userRedPhoto = data.userRedPhoto;
            $('#namered').html(userRed);
            $('#iconred').hide();
            $("#imagered").attr('src',userRedPhoto);
            $("#imagered").show();
            $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge danger"><i class="fa fa-user-plus"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title"><b>' + userRed + '</b> logged in for Team Red! </h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +  getcurrentTime()  + '</small></p></div><div class="timeline-body"><p>This will be exciting. The Fans are anticipating a strong match. Show your support for Team Red: #GoTeamRed - and see what happens!</p></div></div></li></li>');
  });

//############################### LOGIN PLAYER BLUE
  socket.on("LoginPlayerBlue", function(data){
            userBlue = data.userBlue;
            userBluePhoto = data.userBluePhoto;
            $('#nameblue').html(userBlue);
            $('#iconblue').hide();
            $("#imageblue").attr('src',userBluePhoto);
            $("#imageblue").show();
             $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge primary"><i class="fa fa-user-plus"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title"><b>' + userBlue + '</b> logged in for Team Blue! </h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +  getcurrentTime()  + '</small></p></div><div class="timeline-body"><p>This will be exciting. The Fans are anticipating a strong match. Show your support for Team Blue: #GoTeamBlue - and see what happens!</p></div></div></li></li>');
  });


 //############################### SWITCHED SIDES
     socket.on("EventSwitchedSides", function(data){
            userRed = data.userRed;
            userRedPhoto = data.userRedPhoto;
            userBlue = data.userBlue;
            userBluePhoto = data.userBluePhoto;

            $('#namered').html(userRed);
            $("#imagered").attr('src', userRedPhoto);
            $('#nameblue').html(userBlue);
            $("#imageblue").attr('src', userBluePhoto);
            $('.wkval').hide();

            score_red.innerHTML = 0;
            score_blue.innerHTML = 0;

            $('.timeline').prepend('<li><li class="timeline-inverted"><div class="timeline-badge"><i class="glyphicon glyphicon-check"></i></div><div class="timeline-panel"><div class="timeline-heading"><h4 class="timeline-title">Switched Sides. Started Rematch! Enjoy your game!</h4><p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' +   getcurrentTime()  + '</small></p></div><div class="timeline-body"><p> Players switched sides. We are ready. Let us look at the players.<b> '+ userRed + '</b> plays for Team Red and <b>' + userBlue +'</b> for Team Blue. Let us find out!</p></div></div></li></li>');
     });




});
