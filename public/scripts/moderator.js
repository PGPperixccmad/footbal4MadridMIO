var socket = io();

$(document).ready(function(){
//Player logs in
socket.on("profileData",function(member){
    console.log("got it");
    if(member.color == "blue"){  
        $('#ticker').prepend("<div class='well'><p><i class='fa fa-user-plus'></i> Team Blau zeigt sich siegessicher. " + userBlue + " wird Sie heute am Tischkicker in Ehningen vertreten. Die Fans sind gespannt. Ihre Unterstützung könne Sie mit dem Twitter Hashtag #GoTeamBlue zeigen</p></div>");
        }
    if(member.color =="red"){
          $('#ticker').prepend("<div class='well'><p><i class='fa fa-user-plus'></i></i> Der Spieler für Team Rot schreitet an den Tisch. Es ist " + userRed + ". Die Fans sind begeistert. Sie möchten Team Rot anfeuern? Dann twittern Sie mit dem Hashtag #GoTeamRed und lassen Sie sich überraschen, was passiert.</p></div>");    
    }
          });

//
socket.on("bothloggedin",function(member){
           $('#ticker').prepend("<div class='well'><p><i class='fa fa-bell'></i> Beide Teams sind vollständig. Es spielen " + userRed + " für Team Rot und " + userBlue + " für Team Blau gegeneinander. Vergessen Sie nicht Ihre Teams mit #GoTeamRed und #GoTeamBlue anzufeuern! Via dem Start Game-Button können Sie die Partie beginnen!</p></div>"); 
});

socket.on("test", function(msg){
    console.log(msg);
    $('#ticker').append(msg);
}   );
});