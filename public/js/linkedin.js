//LinkedIn
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

function onSuccess(data) {
	var member = data.values[0];
   	var id = member.id;
   	var firstName = member.firstName; 
   	var lastName = member.lastName; 
   	var photo = member.pictureUrl; 
   	var headline = member.headline; 

    console.log('ID:         ' + id);
    console.log('FirstName:  ' + firstName);
    console.log('LastName:   ' + lastName);
    console.log('Photo:      ' + photo);
    console.log('Headline:   ' + headline);
    
    if (selected == 1){
        $('#namered').html(firstName + ' ' + lastName);
        $('#imagered').attr('src',photo);
        $('#iconred').hide();
        $('#LoginButtonRed').hide();
    } else if(selected == 2) {
        $('#nameblue').html(firstName + ' ' + lastName);
        $('#imagered').show();
        $('#imageblue').attr('src',photo);
        $('#iconblue').hide();
        $('#LoginButtonBlue').hide();
    } else {
        alert("error");
    }

    IN.User.logout();
}

function onError(error) {
    console.log(error);
}

function getProfileData() {
    IN.API.Profile("me").fields(["currentShare"])result(onSuccess).error(onError);
}



$(document).ready(function(){
    //Silas Code
    $("#LoginButtonRed").click(function(){
        hey();
        selected = 1;
        //$("#text1").fadeIn("slow");
    });

    $("#LoginButtonBlue").click(function(){
        hey();
        selected = 2;
        //$("#text2").fadeIn("slow");
    });
});
