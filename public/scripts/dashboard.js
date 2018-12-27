// connect to the socket server
var socket = io.connect();


//########################################### Analytics
//Graphs

$(document).ready(function(){
    
           
           
           //[ [[0, 0], [1, 1]] ], { yaxis: { max: 1 } });
    $.get('/goalsByColor',function(res){
        //console.log(res[0]);
        //console.log(res[1]);
        var position = "right";
        $.plot($("#graph"), 
               [
				{ data: res[0], label: "Goals Red" },
				{ data: res[1], label: "Goals Blue"}
			], {
				xaxes: [ { mode: "time", color: "#323232"} ],
				yaxes: [ { min: 0, color: "#323232" }, {
					// align if we are to the right
					alignTicksWithAxis: position == "right" ? 1 : null,
					position: position
				} ],
				legend: { position: "nw", backgroundColor: null },
                colors: ["#d9534f", "#2e6da4"],
                grid: {backgroundColor: "#323232", hoverable: true, clickable: true} 
			});
    });
    
  $('.body').css('color','white');
  
});





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
	var member = data.values[0];
    
   	var id = member.id;
   	var firstName = member.firstName; 
   	var lastName = member.lastName; 
   	var photo = member.pictureUrls.values[0]; 
   	var headline = member.headline; 
    var company = member.positions.values[0].company.name;
    
    if(photo==undefined || photo ==null){
        photo = "../images/public.png";
    }
 
    //GET INDIVIUAL NEMESIS
     $.get('/getNemesis',function(res){
        console.log("go individual");
        var nemesis = res.data;
        nemesis.sort(function(a,b) { 
            return parseFloat(a.value) - parseFloat(b.value); 
        });
        
        nemesis.reverse(); 
         
        function showResults () {
         for (var k in nemesis) { 
             if(nemesis[k].name == "incognito" || nemesis[k].name == "anonymous"){console.log("error.that is not possible.")} else {
                $(".table.nemesis tbody").append("<tr><td><img style='width:10em;'src='"+ nemesis[k].photo+"'></img></td><td>"+nemesis[k].name+"</td><td>"+nemesis[k].value+"</td></tr>"); 
                 }
            }
        }
         
         showResults();
     })
        /* 
        var i = 0;
        for(var k in nemesis) {
            if(i == 0){ 
                $(".table.nemesis tbody").append("<tr class ='firstrow'><td>"+nemesis[k].name+"</td><td><img style='width:10em;'src='"+ nemesis[k].photo+"'></img></td><td>"+nemesis[k].value+"</td></tr>"); 
                } else if (nemesis[k].value >= nemesis[0].value) {
                     $(".table.nemesis tbody firstrow").prepend("<tr class ='firstrow'><td>"+nemesis[k].name+"</td><td><img style='width:10em;'src='"+ nemesis[k].photo+"'></img></td><td>"+nemesis[k].value+"</td></tr>"); i++; 
                } else {
                     $(".table.nemesis tbody firstrow").append("<tr class ='firstrow'><td>"+nemesis[k].name+"</td><td><img style='width:10em;'src='"+ nemesis[k].photo+"'></img></td><td>"+nemesis[k].value+"</td></tr>"); 
                }
        };
    */
     
   
    
    //member = JSON.parse(member);
    
    
    console.log('ID:         ' + id);
    console.log('FirstName:  ' + firstName);
    console.log('LastName:   ' + lastName);
    console.log('Photo:      ' + photo);
    console.log('Headline:   ' + headline);
    console.log('Company:' + company);

    memberRed = member;
    memberRed.color = "red";
    memberRed.photo = photo;
    userRed = (firstName +  " " + lastName);
    console.log(userRed);
    userRedPhoto = photo;
    /*
    $.get('tempKey',{uid:id} , function(res) {
        console.log("hello world");   
    });
    */
    sendSession(id, function(id){
        require(["dojo/request", 
                     "dojo/dom", 
                     "bluemix_g/gamebar", 
                     "dojo/domReady!"
                ], function(request, dom, Gamebar){
                var gamebarContainer = dom.byId("gamebar");
                var gamebarConfig = {
                    connectMode: 'proxy', //'proxy' or 'direct'
                    proxyPath: '/proxy/', //required for 'proxy' mode
                    planName: 'Foosball',
                    uid: id, 
                    refreshInterval:30000 //required for 'proxy' mode
                 }
                 var widget = new Gamebar(gamebarConfig);
                 widget.placeAt(gamebarContainer);
                 widget.startup();
            });
    });
    
    

    
       
    
    /*
    $.post("/account",{uid:id},function(data){       
    console.log("post done");
    });
    */
    
    
    //Log out of LinkedIn
    IN.User.logout();
}

function sendSession(id, callback){
        socket.emit('account', id);    
        callback(id);
    }

function onError(error) {
    console.log(error);
}

function getProfileData() {
    IN.API.Profile("me").fields(["id","firstName","lastName","location","industry","picture-urls::(original)","headline","date-of-birth","num-connections","num-connections-capped","positions:(is-current,company:(name))","following","interests","educations:(school-name,field-of-study,start-date,end-date,degree,activities,notes)"]).result(onSuccess).error(onError);
}

//Silas Code
    $("#LoginButtonRed").click(function(){
        hey();
        selected = 1;
        //$("#text1").fadeIn("slow");
    });




