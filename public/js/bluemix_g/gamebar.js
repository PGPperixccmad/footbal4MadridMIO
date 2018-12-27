/*
 * Copyright 2014 IBM Corp. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Main widget of Gamebar
 */
define("bluemix_g/gamebar", 
		[
		 "dojo/json",
		 "dijit/popup",
		 "dojo/_base/declare",
		 "dijit/_WidgetBase", 
		 "dojo/query",
		 "dojo/mouse",
		 "dojo/dom-geometry",
		 "dojo/on",
		 "dojo/_base/connect",
		 "dojo/cookie",
		 "bluemix_g/gamePopup",
		 "bluemix_g/gameUtil",
		 "bluemix_g/gameNotification",
		 "bluemix_g/gameLeaderboard",
		 "bluemix_g/gameBadge",
		 "bluemix_g/gameMission",
		 "bluemix_g/gameServiceAPI",
		 "dojo/fx",
		 "dojox/charting/Chart",
		 "dojox/charting/SimpleTheme",
		 "dojox/charting/plot2d/Pie",
		 "dojox/charting/axis2d/Default",
		 "dojo/NodeList-traverse",
		 "dojox/widget/rotator/Pan",
		 "dojo/domReady!"
		],
    function(
    			JSON,
    			popup,
	    		declare, 
	    		_WidgetBase, 
	    		query,
	    		mouse,
	    		domGeometry,
	    		on,
	    		connect,
	    		cookie,
	    		gamePopup,
	    		gameUtil,
	    		gameNotification,
	    		gameLeaderboard,
	    		gameBadge,
	    		gameMission,
	    		gameAPI,
	    		fx,
	    		Chart,
	    		SimpleTheme,
	    		PiePlot
    		){
	 return declare([_WidgetBase], {
		 	// general config variables
		 	uid: null, 						//uid of the login user
			proxyPath : '/proxy/', 			//path of the proxy
			planName: null, 				//your plan name
			connectMode: 'proxy',			//connection mode, 'proxy'(default, request send throu) or 'direct'
											//'proxy' 	- request send through proxy configured by proxyPah 
											//'direct' 	- request send directly to Gamification service, 
											//			  'apiProtocol', 'apiHost', 'apiPort' & 'tempKey' are required input
			refreshInterval: 30, 			//default 30 second. if set to -1,  
											//if set to -1, use CometD to get update notification
											//otherwise, periodically pull information for update
			//used for 'direct' mode
			apiProtocol: 'https',			//connection protocol of the Gamification service, 'https' is preferred.
			apiHost: 'gs.ng.bluemix.net',	//host of the Gamification service
			apiPort: '443',					//port of the Gamification service
			tempKey: null,					//tempKey to login to Gamification service

			//internal variables
		 	_this: null,
			xpVarName : null,				//XP name
			cashVarName : null,				//Cash name
			xpVarQName: null,				//XP qualified name
			cashVarQName: null,				//Cash qualifed name
			leaderBoard: {					//config object for leaderboard api which support paging 
				varName: null,				//leaderboard var name, will be set later
				leaderBoardPageCount: 5,	//how many users to be list in one page
				leaderBoardStart: null,		//indicate start index of current page  
				leaderBoardLast: null,		//indicate end index of current page
				data: null					//current leaderboard data
			},

			//data store
			user : null,					//user object
			mission : null,					//user's mission history (currentState=completed,accepted,started)
			deedMeta : null,				//definition of all deed 
			varMeta : null,	 				//definition of all variable
			newUserDeeds : [],				//new deeds that user's awarded
			
			//refreshCallTags - used to indicate if all AJAX call is completed
			//0-init, 1-refreshing, 2-refresh success, 3-refresh failed
			refreshCallTags: {'leaderboard': 0, 'metaDeed': 0},
			refreshing: 0, // 1 - if refresh underway, otherwise 0
			
			//dom object that used for fast access
			container : null,			
			statBanner : null,
			statTabs : null,
			myStatContainer : null,
			awardsContainer : null,
			missionContainer : null,
			misChartContainer: null,
			missionChart : null,
			
			//popups
			gameLeaderboard: null,
			gameMission: null,
			gameBadge: null,
			cashPopup: null,
			progressbarPopup: null,
			popups: [],

			//handler for refresh timer
			_refreshHandler : null,
			
			//flags
			logined: false, 		//flag indicate if user loging using tempkey
			refreshUserPic: false, 	//indicate if refreshUserPic required, used when user update his/her picture
			
			//methods for hookup
			setUserPicUrl: null,
			formatName: function (firstName, lastName, uid) {
				var fullName = (gameUtil.isEmptyWithDefault(firstName, '') + ' ' + gameUtil.isEmptyWithDefault(lastName, '')).trim();
				return (fullName === '' ? uid: fullName);
			},

			/*
			 * called when gamebar initiated
			 */
			postCreate: function(){
			    // Get a DOM node reference for the root of our widget
			    var domNode = this.domNode;
			 
			    // Run any parent postCreate processes
			    this.inherited(arguments);
			    
			    if(domNode != null){			    	
			    	this._this = this;			    	
			    	this.container = dojo.place("<div class='bpmg_stat'></div>", domNode, "last");
			    	this._initBanner();
			    	this._initTabPanes();
			    }
			},
			
			/*
			 * called when gamebar startup
			 */
			startup: function(){
				//validate the configuration
				if(this.connectMode === 'direct'){
					 if(!this.apiProtocol || !this.apiHost || !this.apiPort || !this.tempKey){
						 console.log('Warning!! configuration error - apiProtocol, apiHost, apiPort & tempKey cannot be empty for \'direct\' mode');
						 return false;
					 }
				}else if(!this.proxyPath){
					 console.log('Warning!! configuration error - proxyPath cannot be empty for \'proxy\' mode');
					 return false;
				}

			    gameAPI.config({
			    	connectMode: this.connectMode,
			    	proxyPath:this.proxyPath, 
			    	planName:this.planName,
			    	apiProtocol: this.apiProtocol,
					apiHost: this.apiHost,
					apiPort: this.apiPort,
					tempKey: this.tempKey,
			    });
			    
		    	
				var _this = this;
				this.inherited(arguments);
				if(this.refreshInterval && this.refreshInterval > 0){					
					this._setRefreshIntervalAttr(this.refreshInterval);
				}else{
					connect.subscribe('user', function(){
						//console.log('refreshing due to cometd');
						_this._refresh();
					});
				}
				this._checkLoginAndRefresh();
			},

			/*
			 * set refresh interval
			 */
			_setRefreshIntervalAttr: function(interval){
				this._set('refreshInterval', interval);
				if(this._refreshHandler != null){
					window.clearInterval(this._refreshHandler);
				}
				if(this.refreshInterval != null && this.refreshInterval > 0){
					var _this = this;
					this._refreshHandler = window.setInterval(function(){
						_this._checkLoginAndRefresh();
					}, this.refreshInterval);
				}
			},
			
			/*
			 * login for 'direct' connect mode, if not refresh the gamebar
			 */
			_checkLoginAndRefresh: function(){
				var _this = this;
				if(this.connectMode === 'direct'){
					//if not login and not connected
					if(!this.logined && (!cookie('_bluemix_g_connect') || cookie('_bluemix_g_connect') != 'true')){
						if(!this.refreshInterval || this.refreshInterval <= 0){								
							gameAPI.startCometD(this.uid, this.tempkey);
							var comectDHandler = connect.subscribe('connect', function(isConnected){
								connect.unsubscribe(comectDHandler);
								_this._refresh();
							});
						}else{								
							_this._refresh();
						}
					}else{
						this._refresh();
					}
				}else{
					if(!this.refreshInterval || this.refreshInterval <= 0){						
						gameAPI.startCometD(this.uid);
						var comectDHandler = connect.subscribe('connect', function(isConnected){
							connect.unsubscribe(comectDHandler);
							_this._refresh();
						});
					}else{						
						this._refresh();
					}
				}
			},
			
			/*
			 * handle the refresh logic
			 * asynchronously call API to get required data and call '_checkAndPopulateAll' to verified if all data returned and refresh the widget   
			 */
			_refresh : function(){
				var _this = this;
				if(this.refreshing) {
					return;
				}else{
					this.refreshing = true;
				}
				
				for(var tag in this.refreshCallTags){
					this.refreshCallTags[tag] = false;
				}
				
				gameAPI.getAllMetaVar(function(varlist){
					var meta = {};
					for(var i=0; i<varlist.length; i++){
						meta[varlist[i].qualifiedName] = varlist[i];
					}
					_this.varMeta = meta;

					//find the default varName
					for(var qName in _this.varMeta){
						if(_this.varMeta[qName].defaultVar){						
							if(_this.varMeta[qName].type === 'XP'){
								_this.xpVarName = _this.varMeta[qName].name;
							}else if(_this.varMeta[qName].type === 'VC'){
								_this.cashVarName = _this.varMeta[qName].name;							
							}
						}
					}
					//find variable qualified name
					if(_this.xpVarName != null){
						for(var qName in _this.varMeta){
							if(_this.varMeta[qName].name === _this.xpVarName)
								_this.xpVarQName = qName;
						}
						if(!_this.xpVarQName){					
							console.log("Configuration error: xpVarName(" + _this.xpVarName + ') cannot be found');
							_this.refreshing = false;
							return;
						}
					}
					if(_this.cashVarName != null){
						for(var qName in _this.varMeta){
							if(_this.varMeta[qName].name === _this.cashVarName)
								_this.cashVarQName = qName;
						}
						if(!_this.cashVarQName){					
							console.log("Configuration error: cashVarName(" + _this.cashVarName + ') cannot be found');
							_this.refreshing = false;
							return;
						}
					}
					
					//set varName that is used by leaderboard
				    _this.leaderBoard.varName = _this.xpVarName;

					gameAPI.getUser(_this.uid, function(user){
						_this._loadDataFromLocalStore(user);
						gameAPI.getMission(user.uid, function(missions){
							if(_this.user != null && _this.user.id === user.id){
								_this._checkNewDeed(user);
								_this._checkNewPoints(user);
								_this._checkNewMission(missions);
							}
							_this.user = user; //store current user so that we can compare later
							_this.mission = missions; //store current mission so that we can compare later
							_this._saveDataToStore();
							_this.refreshCallTags['leaderboard'] = 1;
							gameAPI.getLeaderBoard(_this.uid, null, _this.leaderBoard, function(){
								_this.refreshCallTags['leaderboard'] = 2;
								_this._checkAndPopulateAll();
							}, function(){
								_this.refreshCallTags['leaderboard'] = 3;
								_this._checkAndPopulateAll();
							}); //personal leader board 						
							_this.refreshCallTags['metaDeed'] = 1;
							gameAPI.getAllDeedMeta(function(deedMeta){
								_this.refreshCallTags['metaDeed'] = 2;
								_this.deedMeta = deedMeta;
								_this._checkAndPopulateAll();
							}, function(){
								_this.refreshCallTags['metaDeed'] = 3;
								_this._checkAndPopulateAll();
							});
						}, function(){
							//failed to get mission
							_this.refreshing = false;
						});
					}, function(){
						//failed to get user
						_this.refreshing = false;
					});
					
				}, function(){
					//failed to get metavar
					_this.refreshing = false;
				});
			},
			
			/*
			 * asynchronously call API to get required data and refresh widget once all data returned   
			 */
			_checkAndPopulateAll: function(){
				var allFinished = true;
				var allSuccess = true;
				for(var tag in this.refreshCallTags){
					if(this.refreshCallTags[tag] == 1)
						allFinished = false;
					if(this.refreshCallTags[tag] != 2)
						allSuccess = false;
				}
				if(allSuccess){					
					this._populateStatBanner();
					this._populateMyStat();
					this._populateAwards();
					this._populateMissions();
					this._drawMissionStatChart(true);
				}
				if(allFinished){
					this.refreshing = false;
				}
			},
			
			/*
			 * draw banner
			 */
			_initBanner: function(){
				var _this = this;
				this.statBanner = dojo.place('<div class="stat_banner"></div>', this.container, "last");
				var leftColumns = dojo.place('<div class="column_container"></div>', this.statBanner, "last");
				var midColumns = dojo.place('<div class="column_container"></div>', this.statBanner, "last");
				var rightColumns = dojo.place('<div class="column_container"></div>', this.statBanner, "last");
				
				var cash = dojo.place('<div class="column single_line"><div class="coin"><span></span></div></div>', leftColumns, "last");
				
				on(cash, 'click', function(){
					if(!_this.cashPopup){						
						var container = dojo.place('<div></div>', _this.container, 'last');
						_this.cashPopup = new gamePopup({
							id: 'cashPopup',
							content: 'You have <span style="color:green">' + _this.user.varValues[_this.cashVarQName].value + '</span> virtual cash.<br/>This is a virtual currency which is suggested to be tied to real rewards.',
							around: cash,
							beforeShow: function(){_this._hideAllVisablePopupForMobile();},
						});
						_this.cashPopup.placeAt(container);
						_this.cashPopup.startup();
						_this.popups.push(_this.cashPopup);
					}else{
						_this.cashPopup.toggle();
					}
				});


				var rank = dojo.place('<div class="column single_line"><div class="rank"><span></span></div></div>', leftColumns, "last");
				
				//mobile
				on(rank, 'click', function(){
					if(!_this.gameLeaderboard){
						var container = dojo.place('<div></div>', _this.container, 'last');
						var leaderboardParams = {};
						leaderboardParams.gameAPI = _this.gameAPI;
						leaderboardParams.uid = _this.user.uid;
						leaderboardParams.varName = _this.xpVarName;
						leaderboardParams.varQName = _this.xpVarQName;
						leaderboardParams.formatName = function(firstName, lastName, uid){ return _this.formatName(firstName, lastName, uid);};
						leaderboardParams.setUserPicUrl = function(uid){ return _this._getPicUrl(uid);};
						leaderboardParams.baseClass = 'leaderBoardPopup';
						leaderboardParams.containerId = 'leaderBoardPopup';
						leaderboardParams._lookupUserDefaultTitleLable = function(user){return _this._lookupUserDefaultTitleLable(user);};
						leaderboardParams.beforeShow = function(){_this._hideAllVisablePopupForMobile();};
						leaderboardParams.around = rank;
						
						_this.gameLeaderboard = new gameLeaderboard(leaderboardParams);
						_this.gameLeaderboard.placeAt(container);
						_this.popups.push(_this.gameLeaderboard);
					}else{						
						_this.gameLeaderboard.toggle();
					}
				});
				
				var progress = dojo.place('<div class="column progress_column" style="display:none"><span class="progress_title"></span>' + 
						'<span class="point_row"><span class="point_bar_back" style="width:100%"><span class="point_bar_front"></span></span><span class="point_hint"></span></span></div>', midColumns, "last");
				
				on(midColumns, 'click', function(){
					if(!_this.progressbarPopup){						
						var container = dojo.place('<div></div>', _this.container, 'last');
						_this.progressbarPopup = new gamePopup({
							id: 'progressPopup',
							content: function(){return _this._getProgressPopupText();},
							around: midColumns,
							beforeShow: function(){_this._hideAllVisablePopupForMobile();},
						});
						_this.progressbarPopup.placeAt(container);
						_this.progressbarPopup.startup();
						_this.popups.push(_this.progressbarPopup);
					}else{
						_this.progressbarPopup.toggle();
					}
				});

				
				//draw menu
				var menuCol = dojo.place('<div class="column_right single_line menu"></div>', rightColumns, "last");
				
				//draw achievement
				var achievementCol = dojo.place('<div class="column_right single_line achievement " title="No badge earned yet"></div>', rightColumns, "last");
				on(achievementCol, 'click', function(){
					if(!_this.gameBadge){
						var container = dojo.place('<div></div>', _this.container, 'last');
						var badgeParams = {};
						badgeParams.proxyPath = _this.proxyPath;
						badgeParams.planName = _this.planName;
						badgeParams.uid = _this.user.uid;
						badgeParams.xpVarQName = _this.xpVarQName;
						badgeParams.cashVarQName = _this.cashVarQName;
						badgeParams.varMeta = _this.varMeta;
						badgeParams.deedMeta = _this.deedMeta;
						badgeParams.getData = function(){return {
							'varMeta': _this.varMeta,
							'deedMeta': _this.deedMeta,
							'user': _this.user
						};};
						badgeParams.baseClass = 'missionPopup';
						badgeParams.containerId = 'badgePopup';
						badgeParams._lookupUserDefaultTitleLable = function(){return _this._lookupUserDefaultTitleLable(_this.user);};
						badgeParams.beforeShow = function(){_this._hideAllVisablePopupForMobile();};
						badgeParams.around = achievementCol;
						
						_this.gameBadge = new gameBadge(badgeParams);
						_this.gameBadge.placeAt(container);
						_this.gameBadge.startup();
						_this.popups.push(_this.gameBadge);
					}else{						
						_this.gameBadge.toggle();
					}
				});

				//draw mission
				var missionCol = dojo.place('<div class="column_right single_line"></div>', rightColumns, "last");
				var missionContainer = dojo.place('<div class="mission mission_icon1" title="No mission in progress"></div>', missionCol, "last");
				dojo.place('<span class="number"></span>', missionContainer, 'last');
				
				var _this = this;
				on(missionCol, 'click', function(){
					if(!_this.gameMission){
						var container = dojo.place('<div></div>', _this.container, 'last');
						var missionParams = {};
						missionParams.proxyPath = _this.proxyPath;
						missionParams.planName = _this.planName;
						missionParams.uid = _this.user.uid;
						missionParams.getData = function(){return {
							'varMeta': _this.varMeta,
							'missions': _this.user.missions
						};};
						missionParams.xpVarQName = _this.xpVarQName;
						missionParams.cashVarQName = _this.cashVarQName;
						missionParams.baseClass = 'missionPopup';
						missionParams.containerId = 'missionPopup';
						missionParams._lookupUserDefaultTitleLable = function(user){return _this._lookupUserDefaultTitleLable(user);};
						missionParams.beforeShow = function(){_this._hideAllVisablePopupForMobile();};
						missionParams.around = missionCol;
						
						_this.gameMission = new gameMission(missionParams);
						_this.gameMission.placeAt(container);
						_this.popups.push(_this.gameMission);
					}else{						
						_this.gameMission.toggle();
					}
				});
				
				var progress = dojo.query('.progress_column', this.statBanner)[0];
				dojo.style(progress, 'display', 'block');
			},
			
			/*
			 * draw Gamebar detail tabs
			 */
			_initTabPanes : function(){
				var _this = this;
				
				this.statTabs = dojo.place('<div class="stat_tab_container" style="display:none"></div>', this.container, "last");
				
				var dialog = '<div class="statDialog" role="dialog">' +
				'<div>' +
				'<span class="dialogCloseIcon" title="Close">' +
				'</span>' +
				'</div>' +
			    '</div>';
				var dialogNode = dojo.place(dialog, this.statTabs, "last");
				var tabContainer = dojo.place('<div></div>', dialogNode, "last");
				var tabRow = dojo.place('<ul class="tabRow"></ul>', tabContainer, "last");
				var missionTab = dojo.place('<li class="tab"><span>Missions</span></li>', tabRow, "last");
				var achievementTab = dojo.place('<li class="tab"><span>Badges</span></li>', tabRow, "last");
				var myStatTab = dojo.place('<li class="tab"><span>My Profile</span></li>', tabRow, "last");
				
				var tabContentContainer = dojo.place('<div class="contentContainers"></div>', tabContainer, "last");
				
				this.myStatContainer = dojo.place('<div class="stat_tab tab_content"></div>', tabContentContainer, "last");
				this.awardsContainer = dojo.place('<div class="awards_tab tab_content"></div>', tabContentContainer, "last");
				this.missionContainer = dojo.place('<div class="mission_tab tab_content"></div>', tabContentContainer, "last");
				
				on(missionTab, 'click', function(evt){
					_this._selectPanel(this, _this.missionContainer);
				});
				
				on(achievementTab, 'click', function(evt){
					_this._selectPanel(this, _this.awardsContainer);
				});
				
				on(myStatTab, 'click', function(evt){
					_this._selectPanel(this, _this.myStatContainer);
					_this._drawMissionStatChart();
				});
				
				//set profile tab to be shown
				this._selectPanel(myStatTab, this.myStatContainer);			
				
				//bind close button
				on(dojo.query('.dialogCloseIcon', this.statTabs)[0], 'click', function(evt){
					fx.wipeOut({ node: _this.statTabs }).play();
				});

				//bind menu button
				on(dojo.query('.menu', this.statBanner)[0], 'click', function(evt){
					if(gameUtil.isVisible(dojo.query('.statDialog', this.statBanner)[0])){
						fx.wipeOut({ node: _this.statTabs }).play();
					}else{						
						fx.wipeIn({ node: _this.statTabs }).play();
						_this._drawMissionStatChart();
					}
				});				
			},
			
			/*
			 * function to switch panel when different tab is clicked
			 */
			_selectPanel : function(tab, contentContainer){
				var _this = this;
				dojo.query('.tab', this.statTabs).removeClass('tab_selected');
				dojo.addClass(tab, 'tab_selected');
				dojo.query('.tab_content', dojo.query('.contentContainers',this.statTabs)[0]).forEach(function(node, index, arr){
					dojo.style(node, 'display', 'none');
				});
				dojo.style(contentContainer, 'display', 'block');
			},
			
			/*
			 * populate data to banner
			 */
			_populateStatBanner : function(){
				
				//draw cash
				var userCash = 0;
				var coinLabel = null;
				if(this.user.varValues != null && this.user.varValues[this.cashVarQName] != null){					
					userCash = this.user.varValues[this.cashVarQName].value;
					coinLabel = this.user.varValues[this.cashVarQName].varLabel;
				}
				var coinCol = dojo.query('.column .coin span', this.statBanner)[0];
				coinCol.innerHTML = userCash;
				dojo.attr(coinCol, 'title', (gameUtil.isEmptyWithDefault(coinLabel, 'Cash') + ' earned: ' + userCash));
				
				//draw rank
				var ranking = this.leaderBoard != null? this.leaderBoard.data.userRank: 0;
				
				var xpLabel = null;
				if(this.user.varValues != null && this.user.varValues[this.xpVarQName] != null){					
					xpLabel = this.user.varValues[this.xpVarQName].varLabel;
				}
				var rankingStr = ranking + ' of ' + this.leaderBoard.data.totalCount;
				var rankCol = dojo.query('.column .rank span', this.statBanner)[0];
				rankCol.innerHTML = rankingStr;
				dojo.attr(rankCol, 'title', ('Ranked ' + ranking + ' out of ' + this.leaderBoard.data.totalCount + ' in ' + (gameUtil.isEmptyWithDefault(xpLabel, 'XP'))));
				


				//draw progress
				var level = 0;
				var percent = 0;
				var hint = '';
				var title = null;
				var score = null;
				if(this.user.varValues != null && this.user.varValues[this.xpVarQName] != null){					
					score = this.user.varValues[this.xpVarQName];
					percent = Math.round(Math.max((score.value - score.currentLevelThreshold), 0) / (score.nextLevelThreshold - score.currentLevelThreshold) * 100);
					level = score.level;
					hint = parseInt((score.nextLevelThreshold - score.value)) + " XP till next level";
					title = score.currentLevelTitle;
				}

				dojo.query('.progress_column .progress_title', this.statBanner)[0].innerHTML = 'Level ' + level + (title == null? '': ' ' + title);
				var pointFront = dojo.query('.progress_column .point_row .point_bar_front', this.statBanner)[0];
				dojo.style(pointFront, 'width',  percent + '%');
				dojo.query('.progress_column .point_row .point_hint', this.statBanner)[0].innerHTML = hint;
				dojo.query('.progress_column', this.statBanner)[0].title = ('Current: ' + (score == null? 0: score.value) + ' XP');
			},
			
			/*
			 * populate data to profile tab
			 */
			_populateMyStat : function(){
				var _this = this;
				gameUtil.destroyChildren(this.myStatContainer);
				var row = dojo.place('<div class="first_row"></div>', this.myStatContainer, 'last');
				var secondRow = dojo.place('<div class="title_select_row"></div>', this.myStatContainer, 'last');
				var profileCol = dojo.place('<div class="profile_column"><div class="img_container"><input type="file" style="display:none"/><div title="update photo" class="edit_icon"></div><img src="' + this._getPicUrl(this.user.uid) + '"/></div></div>', row, 'last');
				on(dojo.query('.edit_icon', profileCol), 'click', this._openAvatarUploader);
				on(dojo.query('input[type=file]', profileCol), 'change', function(){
					_this._uploadAvatar(this, _this);
				});
				
				dojo.place('<div class="name">' + this.formatName(this.user.firstName, this.user.lastName, this.user.uid) + '</div>', profileCol, 'last');
				
				//put title
				var titleDiv = dojo.place('<div class="title"></div>', profileCol, 'last');
				var title = this._lookupUserDefaultTitleLable(this.user);
				
				if(title != null){
					var _this = this;
					titleDiv.innerHTML = title;
				}
				
				//draw title dropdown
				var titleAchieved = null;
				for(var qName in this.user.userDeeds){
					var deed = this.user.userDeeds[qName];
					if(deed.deedType === 'title' && deed.deedValue === 'Y' && deed){
						if(titleAchieved == null){
							titleAchieved = {};
						}
						titleAchieved[deed.deedName] = deed;
					}
				}
				if(titleAchieved == null){
					//dojo.place('<div>No tilte achieved yet</div>', secondRow, 'last');
				}else{
					dojo.place('<div>Title Achieved: </div>', secondRow, 'last');
					var titleSelection = dojo.place('<div></div>', secondRow, 'last');
					var selectHtml = '<select><option value="">Choose one to show...</option>';
					for(var name in titleAchieved){
						selectHtml += '<option ' + (name === this.user.defaultTitleName? 'class="defaultTitle" ': '') + 'value="' + titleAchieved[name].deedName + '">' 
						 + (name === this.user.defaultTitleName? ' &#10004; ': '&nbsp;&nbsp;&nbsp;&nbsp;') + titleAchieved[name].deedLabel
						+ '</option>';
					}
					var selectEle = dojo.place(selectHtml, titleSelection, 'last');
					function onTitleSelect(_this, titleDiv, selectEle, titleAchieved){
						return function(evt){
							var titleName = selectEle.value;
							if(titleName === '')
								return;
							gameAPI.updateDefaultTitle(_this.user.uid, titleName, function(data, ioargs){
								_this.user.defaultTitleName = titleName;
								titleDiv.innerHTML = titleAchieved[titleName].deedLabel;
								var options = '<option value="">Choose one to show to others ...</option>';
								gameUtil.destroyChildren(selectEle);
								for(var name in titleAchieved){
									options += '<option ' + (name === _this.user.defaultTitleName? 'class="defaultTitle" ': '') + 'value="' + titleAchieved[name].deedName + '">' 
									+ titleAchieved[name].deedLabel + (name === _this.user.defaultTitleName? ' &#10004; ': '') 
									+ '</option>';
								}
								dojo.place(options, selectEle, 'last');
							}, function(error){
								alert("An unexpected error occurred: " + error);
							});
						};
					}
					on(selectEle, 'change', onTitleSelect(_this, titleDiv, selectEle, titleAchieved));
				}
								
				var misChartCol = dojo.place('<div class="task_column"><div class="label">Mission Status</div></div>', row, 'last');
				this.misChartContainer = dojo.place('<div class="task_chart"></div>', misChartCol, 'last');
				var contPos = domGeometry.position(this.myStatContainer);
				if(contPos.w > 0 && contPos.h > 0){
					_this._drawMissionStatChart(true);
				}

				//leader board
				var leaderBoardCol = dojo.place('<div class="leaderboard_column"><div class="label">Leaderboard</div></div>', row, 'last');
				var leaderBoardTooltipContainer = dojo.place('<div class="leaderboard_tooltip"></div>', leaderBoardCol, 'last');
				var leaderBoardBarContainer = dojo.place('<div class="leaderboard_row"></div>', leaderBoardCol, 'last');
				var leaderBoardNav = dojo.place('<div class="leaderboard_nav"></div>', leaderBoardCol, 'last');
				var leaderBoardNavPrev = dojo.place('<div class="arrow-up"></div>', leaderBoardNav, 'last');
				var leaderBoardNavNext = dojo.place('<div class="arrow-down"></div>', leaderBoardNav, 'last');
				this._refreshLeaderBoard(leaderBoardBarContainer, leaderBoardNavNext, leaderBoardNavPrev);
				on(leaderBoardNavNext, 'click', function(){
					gameAPI.getLeaderBoard(_this.uid, true, _this.leaderBoard, function(){						
						_this._refreshLeaderBoard(leaderBoardBarContainer, leaderBoardNavNext, leaderBoardNavPrev);
					});
				});
				on(leaderBoardNavPrev, 'click', function(){
					gameAPI.getLeaderBoard(_this.uid, false, _this.leaderBoard, function(){						
						_this._refreshLeaderBoard(leaderBoardBarContainer, leaderBoardNavNext, leaderBoardNavPrev);
					});
				});
			},
			
			/*
			 * method to make hidden file input tag to be triggered
			 */
			_openAvatarUploader: function(evt){
				dojo.query("input[type=file]", evt.target.parentNode)[0].click();
			},
			
			/*
			 * encode the uploaded image to BASE64 string and upload to gamification service 
			 */
			_uploadAvatar: function(input, gamebar){
				if (input.files && input.files[0]) {
					var f= new FileReader();
					f.onloadend = function(e) {
						var img = new Image();
						img.src = f.result;
						img.onload = function(){
							var outputHeight = 80;
							var scale = outputHeight / img.height;
							var outputWidth = scale * img.width;
	
							var canvas = document.createElement("canvas");
							canvas.width = outputWidth;
							canvas.height = outputHeight;
								
							var ctx = canvas.getContext("2d");
							ctx.scale(scale, scale);
							ctx.drawImage(img, 0, 0);
	
							var dataURL = canvas.toDataURL("image/png");
							var base64 = dataURL.substring(dataURL.indexOf(',') + 1);
	
							gameAPI.updateAvatar(gamebar.uid, base64, function(){
								gamebar.refreshUserPic = true;
								gamebar._populateMyStat();
							}, function(){
								alert('There is some error, please try again later');
							});
						};
						return false;			
					};       
					f.readAsDataURL(input.files[0]);
				}
			},
			
			/*
			 * function for looking up the lable of user's selected title
			 */
			_lookupUserDefaultTitleLable: function(user){
				if(gameUtil.isEmpty(user.defaultTitleName))
					return null;
				var title = '';
				for(var qName in user.userDeeds){
					var deed = user.userDeeds[qName];
					if(deed.deedType == 'title' && deed.deedValue == 'Y' && deed.deedName == user.defaultTitleName){							
						title = deed.deedLabel;
						break;
					};
				};
				return title;
			},
			
			/*
			 * function for show user's picture. If custom 'setUserPicUrl' function is set use it, otherwise use picture link from gamification service
			 */
			_getPicUrl: function(uid){
				var picSrc = '';
				if(this.setUserPicUrl != null && typeof(this.setUserPicUrl) === "function"){
					var newPicSrc = this.setUserPicUrl(uid);
					if(newPicSrc != null && typeof newPicSrc === 'string')
						picSrc = newPicSrc;
				}else{
					var picRoot = this.proxyPath;
					if(this.connectMode === 'direct'){
						picRoot = this.apiProtocol + '://' + this.apiHost + ':' + this.apiPort + '/';
					}
					picSrc = picRoot + 'service/plan/' + this.planName + '/user/' + uid + '/pic' + (this.refreshUserPic? '?r='+Math.random(): '');						
				}
				return picSrc;
			},
			
			/*
			 * function to refresh leaderboard
			 */
			_refreshLeaderBoard: function(leaderBoardBarContainer, leaderBoardNavNext, leaderBoardNavPrev){
				gameUtil.destroyChildren(leaderBoardBarContainer);
				var _this = this;
				var leaderBoardData = this.leaderBoard.data.participants;
				if (leaderBoardData != null) {
					// find max
					var max = this.leaderBoard.data.maxValue;

					for ( var i = 0; i < leaderBoardData.length; i++) {
						// add row
						var isHighlight = false;
						var userName = this.formatName(leaderBoardData[i].userFirstName, leaderBoardData[i].userLastName, leaderBoardData[i].uid);
						var userNameShort = this._cutUserName(userName, 20);
						var rowDom = dojo.place('<div class="point_row" title="' + userName + '"></div>', leaderBoardBarContainer, "last");
						if(this.user.region == null){	
							var avatar = dojo.place('<div class="avatar_container"><img class="leaderBoard_avatar" src="' + this._getPicUrl(leaderBoardData[i].uid) + '"/></div>', rowDom);
							
							function drawTooltip(uid, avatar, _this){
								return function(evt){
									var tooltip = dojo.query(avatar).closest('.leaderboard_column').children('.leaderboard_tooltip')[0];
									gameAPI.getUser(uid, function(user){
										var title = _this._lookupUserDefaultTitleLable(user);
										if(title == null) title = '';
										var tooltip = dojo.query(avatar).closest('.leaderboard_column').children('.leaderboard_tooltip')[0];
										gameUtil.destroyChildren(tooltip);
										var content = '<img src=' + _this._getPicUrl(uid) + '/>' + 
										              '<div style="display:inline-block">' + 
										              '<div>' + _this.formatName(user.firstName, user.lastName, user.uid) + '</div>' +
										              '<div class="title">' + title + '</div>' +
										              '<div>Level:' + user.varValues[_this.xpVarQName].level + '</div></div>';
										dojo.place(content, tooltip, 'last');
										var rP = domGeometry.position(avatar);
										dojo.addClass(tooltip, 'leaderboard_tooltip_show');
										dojo.style(tooltip, 'top', parseInt(rP.y - tooltip.offsetHeight - 8) + 'px'); 
										dojo.style(tooltip, 'left', parseInt(rP.x - tooltip.offsetWidth/2) + 'px'); 
									});
								};
							};
							
							// add tooltip
							on(avatar, mouse.enter, drawTooltip(leaderBoardData[i].uid, avatar, _this));
							on(avatar, mouse.leave, function(){
								var tooltip = dojo.query(this).closest('.leaderboard_column').children('.leaderboard_tooltip')[0];
								dojo.removeClass(tooltip, 'leaderboard_tooltip_show');
							});
							
							
							isHightlight = leaderBoardData[i].userId == this.user.id;
						}else{
							isHightlight = leaderBoardData[i].region == this.user.region;
						}
						// Add name
						var percent = Math.round((leaderBoardData[i].value / max) * 100);
						var barContainerDom = dojo.place('<div class="point_bar_container' + (this.user.region == null? '': ' region') 
											+ '" title="rank:' + leaderBoardData[i].rank + ' / ' + leaderBoardData[i].value + 'pt"></div>', rowDom, "last");
						var id = 'bpmg_leaderBoard_' + i;
						var pointBarDom = dojo.place('<div id="' + id 
										+ '" class="' + (isHightlight ? 'point_bar_highlight' : 'point_bar')
										+ '" style="width:' + percent + '%' 
										+ '"></div>', barContainerDom, "last");
						if(this.user.region != null){							
							var nameDom = dojo.place('<div class="point_name">' + leaderBoardData[i].region + '</div>', rowDom, "last");
						}else{
							var nameDom = dojo.place('<div class="point_name">' + userNameShort + '</div>', rowDom, "last");
						}						
					}
					
					//determine the visibility of next, prev button
					if(this.leaderBoard.leaderBoardStart + this.leaderBoard.leaderBoardPageCount <= this.leaderBoard.data.totalCount){
						dojo.style(leaderBoardNavNext, 'visibility', 'visible');
					}else{
						dojo.style(leaderBoardNavNext, 'visibility', 'hidden');
					}

					if(this.leaderBoard.leaderBoardStart > this.leaderBoard.leaderBoardPageCount){
						dojo.style(leaderBoardNavPrev, 'visibility', 'visible');
					}else{
						dojo.style(leaderBoardNavPrev, 'visibility', 'hidden');
					}					
				}				
			},

			
			/*
			 * funciton used to truncate username in leaderboard
			 */
			_cutUserName: function(userName, max){
			    var temp = '';
			    for (var ind = 0, count = 0; ind < userName.length; ind++) {
			        if (userName.charCodeAt(ind) > 255) {
			            count += 2;
			            if (count > max) return (temp + ' ...');
			            temp += userName.charAt(ind);
			        } else {
			            count++;
			            if (count > max) return (temp + ' ...');
			            temp += userName.charAt(ind);
			        }
			        
			    }
			    return temp;
			},
							
			/*
			 * populate data to badge tab
			 */
			_populateAwards: function(){
				gameUtil.destroyChildren(this.awardsContainer);
				var latestDeed = null;
				if(this.deedMeta != null && this.deedMeta.length > 0){
					//[label, deedInfo{deeds}]
					//deeds is {meta, criterias[{var, attr, op, criteriaValue}]}
					//if s, label is meta.name 
					var deedGroupMap = {};
					for(var i=0; i<this.deedMeta.length; i++){
						var meta = this.deedMeta[i];
						if(meta.type != 'badge')
							continue;
						
						var label = meta.name;

						//try to find the criteria
						var criterias = [];
						if(meta.criteria != null){
							var cris = meta.criteria.split('&');
							for(var j=0; j<cris.length; j++){
								var regex = /vars\.(.+)\.((value)|(level))(\s*([>=]+)\s*)(\d+)/g;
								try{
									var match = regex.exec(cris[j]);
									var value = parseFloat(match[match.length-1]);
									var criteriaAttr = match[2]; //value or level 
									var op = match[6];
									var varQname = match[1];
									var criteria = {};
									criteria['var'] = varQname.indexOf('.') >=0? varQname: this._getVarByName(varQname).qualifiedName;
									criteria['attr'] = criteriaAttr;
									criteria['op'] = op;
									criteria['criteriaValue'] = value;
									criterias.push(criteria);
								}catch(err){
								}
							}
						}

						var deed = {'meta':meta, "criterias":criterias};
						deedGroupMap[meta.name] = {'deeds': deed};
					}
					
					//render
					var deedCount = 0;
					var latestUnitLabel = '';
					for(var key in deedGroupMap){
						var deedInfo = deedGroupMap[key];
						var deed = deedInfo.deeds;
						var deedRow = dojo.place('<div class="deed_row"></div', this.awardsContainer, "last");
						var iconContainer = dojo.place('<div class="deed_icon_container"></div', deedRow, "last");
						var awarded = false;
						var cls = 'badge_empty';
						if(this.user.userDeeds[deed.meta.qualifiedName] != null && this.user.userDeeds[deed.meta.qualifiedName].deedValue == 'Y'){
							latestDeed = deed;
							cls = "badge_gold";
							deed.displayClass = cls;								
							awarded = true;
						}
						
						this._drawDeedImage(deed.meta, iconContainer, awarded, 60, 'auto');
							
						//text
						var deedText = dojo.place('<div class="deed_text_container"></div>', deedRow, "last");
						dojo.place('<div class="deed_title">' + deedInfo.deeds.meta.label + '</div>', deedText, "last");
						if(!awarded){
							var earnedText = '';
							var requiredText = '';
							for(var j=0; j<deed.criterias.length; j++){
								var cri = deed.criterias[j];
								var currentValue = this.user.varValues[cri['var']] == null? 0: this.user.varValues[cri['var']][cri['attr']];
								if(currentValue == null)
									currentValue = 0;

								earnedText += (earnedText != ''? ', ': '') + this._formatEarnedText(this.varMeta[cri['var']].label, cri['attr'], currentValue);
								requiredText += (requiredText != ''? ', ': '') + this._formatRequireText(currentValue, cri.op, this.varMeta[cri['var']].label, cri['attr'], cri.criteriaValue);  
							}
							dojo.place('<div>' + earnedText + '</div>', deedText, "last");
							dojo.place('<div>' + 'Needed for this badge: '+ requiredText + '</div>', deedText, "last");
						}else{
							dojo.place('<div>Badge Acquired</div>', deedText, "last");
						}
						
						deedCount++;
					}
				}
					
				//[label, deedInfo{deeds}]
				//label is meta.name 
				//deeds is {meta, criterias[{var, attr, op, criteriaValue}]}
				//achievement
				var achievementDiv = dojo.query('.achievement', this.statBanner)[0];
				gameUtil.destroyChildren(achievementDiv);
				this._drawDeedImage((latestDeed == null? null: latestDeed.meta), achievementDiv, (latestDeed != null), 34, 'auto');
				//update achievement number
				if(this.newUserDeeds.length > 0){
					dojo.place('<span class="count_number">' +  this.newUserDeeds.length + '</span>', achievementDiv, 'last');
				}
				
				if(latestDeed != null){
					dojo.attr(achievementDiv, 'title', 'Last achievement earned: ' + latestDeed.meta.label);
				}else{
					dojo.attr(achievementDiv, 'title', 'No badges earned yet');
				}
					
			},	
			
			/*
			 * populate data to mission tab
			 */
			_populateMissions : function(){
				gameUtil.destroyChildren(this.missionContainer);
				var missionRows = dojo.place('<div class="mission_rows"></div>', this.missionContainer, 'last');
				
				if(this.user.missions != null){
					var missionCount = 0;
					var lastMission = null;
					for(var i=0; i<this.user.missions.length; i++){
						//draw missions
						var mis = this.user.missions[i];
						var pointObj = {};
						if(mis.events != null){
							for(var j=0; j<mis.events.length; j++){
								//find the first impact for default variable
								if(mis.events[j].impacts != null){
									for(var k=0; k<mis.events[j].impacts.length; k++){
										var impact = mis.events[j].impacts[k];
										var targetRegex = /vars\.(.+)\.((value)|(level))/g;
										var formulaRegex = /vars\.(.+)\.((value)|(level))(\s*([+\-]+)\s*)(\d+)/g;
										try{
											var match = targetRegex.exec(impact.target);
											var attr = match[2]; //value or level 
											var varQname = match[1];
											varQname = varQname.indexOf('.') >=0? varQname: this._getVarByName(varQname).qualifiedName;
											
											var match_f = formulaRegex.exec(impact.formula);
											var value_f = parseFloat(match_f[match_f.length-1]);
											var attr_f = match_f[2]; //value or level 
											var op_f = match_f[6];
											var varQname_f = match_f[1];
											varQname_f = varQname_f.indexOf('.') >=0? varQname_f: this._getVarByName(varQname_f).qualifiedName;

											if(pointObj.xp == null && this.xpVarQName === varQname && varQname === varQname_f && attr === attr_f){
												pointObj['xp'] = {
														value: value_f,
														attr: attr_f,
														op: op_f
												};
											}else if(pointObj.blueCash == null && this.cashVarQName === varQname && varQname === varQname_f && attr === attr_f){
												pointObj['blueCash'] = {
														value: value_f,
														attr: attr_f,
														op: op_f
												};
											}
										}catch(err){
										}
									}
								}
							}
						}
						
						var missionRow = 
						'<div class="mission_row">' +
						'<div class="mission_icon_col" title="' + mis.label + '">' + 
						'<div class="mission_icon mission_icon' + ((i+1)%3+1) + '">' + (i+1) + '</div><div class="mission_label">' + mis.label + '</div></div>' + 
						'<div class="mission_desc" title="' + gameUtil.escapeNewLine4Title(mis.description) + '">' + gameUtil.escapeNewLine4Html(mis.description) + '</div>' +
						(pointObj.blueCash != null? ('<div class="mission_blueCoin">' + gameUtil.formatMissionPoint(pointObj.blueCash) +'</div>'): '<div class="mission_blueCoin hide_background"></div>') +
						(pointObj.xp != null? ('<div class="mission_xp">' + gameUtil.formatMissionPoint(pointObj.xp) + 'XP</div>'): '<div class="mission_xp"></div>') +
						'</div>';
						dojo.place(missionRow, missionRows, 'last');
						missionCount++;
						lastMission = mis;
					}
					
					//draw mission
					var missionDiv = dojo.query('.mission', this.statBanner)[0];
					dojo.removeClass(missionDiv, 'mission_icon1 mission_icon2 mission_icon3');
					dojo.query('.column_right .number', this.statBanner)[0].innerHTML = missionCount;	
					if(missionCount > 0){						
						dojo.attr(missionDiv, 'title', 'Mission: ' + lastMission.label + '. ' + gameUtil.escapeNewLine4Title(lastMission.description));
						dojo.toggleClass(missionDiv, 'mission_icon' + (missionCount%3+1));
					}else{
						dojo.attr(missionDiv, 'title', 'No mission in progress');
						dojo.toggleClass(missionDiv, 'mission_icon1');						
					}
				}
			},
			
			/*
			 * draw mission status chart
			 */
			_drawMissionStatChart: function(forceRedraw){
				if(this.misChartContainer == null) return;
				if(forceRedraw && this.missionChart != null){
					this.missionChart.destroy();
					this.missionChart = null;
				}

				var chartPos = dojo.position(this.misChartContainer);
				if(chartPos.w == 0 || chartPos.h == 0) return;

				if(this.missionChart == null){
					var chartData = null;
					if(this.user.missionStateCount != null){
						var categoryCount = this.user.missionStateCount;
						var acceptedCount = (categoryCount.accepted == null? 0: categoryCount.accepted);
						var completedCount = (categoryCount.completed == null? 0: categoryCount.completed);
						var abandonedCount = (categoryCount.abandoned == null? 0: categoryCount.abandoned);

						chartData = [
						             { x: 1, y: acceptedCount, text: 'Ongoing:' + acceptedCount, color: "#f6d020", stroke:  {width: 1, color: "#fff"} },
						             { x: 1, y: completedCount, text: 'Completed:' + completedCount, color: "#78b05b", stroke:  {width: 1, color: "#fff"} },
						             { x: 1, y: abandonedCount, text: 'Abandoned:' + abandonedCount, color: "#D9182D", stroke:  {width: 1, color: "#fff"} }
					             ];

						this.missionChart = new Chart(this.misChartContainer);
						this.missionChart.setTheme(new SimpleTheme({
							plotarea: { fill: "#efeff1" },
							chart:{ fill: "#efeff1" }
					    }));
						
						// Add the only/default plot
						this.missionChart.addPlot("default", {
							type: PiePlot,
							fontColor: "black",
							shadow : false
						});
												
						// Add the series of data
						this.missionChart.addSeries("x", chartData);

						// Render the chart!
						this.missionChart.render();
					}					
				}
				
			},
			
			/*
			 * function to draw image of deed
			 */
			_drawDeedImage: function(metaDeed, iconContainer, awarded, imageHeight, imageWidth){
				var imageShowed = false;
				var defaultBadgeClass = awarded? 'badge_gold': 'badge_empty';
				if(metaDeed != null){
					if('base64' === metaDeed.imageType){
						if(!gameUtil.isEmpty(metaDeed.imageBase64)){
							var icon = dojo.place('<image class="deed_icon" title="' + gameUtil.escapeNewLine4Title(metaDeed.description) +'" src="data:image/png;base64,' +
									metaDeed.imageBase64 + '"/>', iconContainer, "first");
							if(imageHeight){
								dojo.style(icon, 'height', imageHeight + ((typeof imageHeight === 'number')? 'px': ''));
							}
							if(imageWidth){							
								dojo.style(icon, 'width', imageWidth + ((typeof imageWidth === 'number')? 'px': ''));
							}
							if(dojo.style(iconContainer, 'display').indexOf('table-cell') < 0){								
								dojo.style(icon, 'position', 'relative');
								dojo.style(icon, 'top', '50%');
								dojo.style(icon, 'marginTop', -imageHeight/2 + 'px');
							}
							imageShowed = true;
						}
					}else if('url' === metaDeed.imageType){
						if(!gameUtil.isEmpty(metaDeed.imageUrl)){
							if(!gameUtil.isEmpty(metaDeed.imageUrlPos)){
								var icon = dojo.place('<div class="deed_icon" title="' + gameUtil.escapeNewLine4Title(metaDeed.description) +'"></div>', iconContainer, "first");
								dojo.style(icon, 'backgroundImage', 'url(' + metaDeed.imageUrl + ')');
								var imagePos = JSON.parse(metaDeed.imageUrlPos, true);
								dojo.style(icon, 'backgroundSize', 'initial');
								dojo.style(icon, 'backgroundPosition', '-' + imagePos.x + 'px -' + imagePos.y + 'px');
								var containerHeight = (imageHeight && typeof imageHeight === 'number') ? imageHeight: dojo.style(icon, 'height') * 0.9;
								var ratio = containerHeight / imagePos.h;
								dojo.style(icon, 'width', imagePos.w + 'px');
								dojo.style(icon, 'height', imagePos.h + 'px');
								dojo.style(icon, '-msTransform', 'scale(' + ratio  + ')');
								dojo.style(icon, '-webkitTransform', 'scale(' + ratio  + ')');
								dojo.style(icon, 'transform', 'scale(' + ratio  + ')');
								if(dojo.style(iconContainer, 'display').indexOf('table-cell') < 0){								
									dojo.style(icon, 'position', 'relative');
									dojo.style(icon, 'top', '50%');
									dojo.style(icon, 'left', '50%');
									dojo.style(icon, 'marginTop', -imagePos.h/2 + 'px');
									dojo.style(icon, 'marginLeft', -imagePos.w/2 + 'px');
								}
							}else{									
								var icon = dojo.place('<image class="deed_icon" title="' + gameUtil.escapeNewLine4Title(metaDeed.description) +'" src="' +
										metaDeed.imageUrl
										+ '"/>', iconContainer, "first");
								if(imageHeight){
									dojo.style(icon, 'height', imageHeight + ((typeof imageHeight === 'number')? 'px': ''));
								}
								if(imageWidth){							
									dojo.style(icon, 'width', imageWidth + ((typeof imageWidth === 'number')? 'px': ''));
								}
								if(dojo.style(iconContainer, 'display').indexOf('table-cell') < 0){								
									dojo.style(icon, 'position', 'relative');
									dojo.style(icon, 'top', '50%');
									dojo.style(icon, 'marginTop', -imageHeight/2 + 'px');
								}
							}
							imageShowed = true;
						}
					}
					if(!imageShowed){
						dojo.place('<div class="deed_icon ' + defaultBadgeClass + '" title="' + gameUtil.escapeNewLine4Title(metaDeed.description) +'"></div>', iconContainer, "first");
					}
				}else{
					dojo.place('<div class="deed_icon ' + defaultBadgeClass + '" ></div>', iconContainer, "first");
				}
			},
			
			/*
			 * check if there is new deed and show notification
			 */
			_checkNewDeed: function(userValue){
				//check new deed
				this.newUserDeeds = [];
				var newUserTitles = [];
				for(key in userValue.userDeeds){
					var deed = userValue.userDeeds[key];
					if(deed.deedValue == 'Y'){								
						if(this.user.userDeeds[key] == null || this.user.userDeeds[key].deedValue != 'Y'){
							if(deed.deedType == 'badge')
								this.newUserDeeds.unshift(deed);
							else if(deed.deedType == 'title')
								newUserTitles.unshift(deed);
						}
					}
				}
				if(this.newUserDeeds != null && this.newUserDeeds.length > 0){
					var message = "";
					for(var i=0; i<this.newUserDeeds.length; i++){
						message += (i>0 ? ", ": "") + '"' + this.newUserDeeds[i].deedLabel + '"';
					}
					if(this.newUserDeeds.length > 1){						
						message = 'Congratulations!! Following badges have been awarded for you: ' + message; 
					}else{
						message = 'Congratulations!! Following badge has been awarded for you: ' + message; 
					}
					this._showNotification(message);
				}
				if(newUserTitles != null && newUserTitles.length > 0){
					var message = "";
					for(var i=0; i<newUserTitles.length; i++){
						message += (i>0 ? ", ": "") + '"' + newUserTitles[i].deedLabel + '"';
					}
					if(newUserTitles.length > 1){						
						message = 'Congratulations!! Following titles have been awarded for you: ' + message; 
					}else{
						message = 'Congratulations!! Following title has been awarded for you: ' + message; 
					}
					this._showNotification(message);
				}
			},
			
			/*
			 * check if user got more points and/or level is up 
			 */
			_checkNewPoints: function(userValue){
				//check point
				var oldXP, oldCoin = 0;
				var oldXPLevel = null;
				var xpDiff, xpLevel, coinDiff;
				if(this.user.varValues[this.xpVarQName]){
					oldXP = this.user.varValues[this.xpVarQName].value;
					oldXPLevel = this.user.varValues[this.xpVarQName].level;
				}
				if(userValue.varValues[this.xpVarQName]){
					xpDiff = userValue.varValues[this.xpVarQName].value - oldXP;
					xpLevel = (userValue.varValues[this.xpVarQName].level != oldXPLevel)? userValue.varValues[this.xpVarQName].level: null;
				}
				
				if(this.user.varValues[this.cashVarQName]){
					oldCoin = this.user.varValues[this.cashVarQName].value;
				}

				if(userValue.varValues[this.cashVarQName]){
					coinDiff = userValue.varValues[this.cashVarQName].value - oldCoin;
				}
				
				//check coin
				var message = '';
				if(xpDiff != null && xpDiff > 0){
					message += xpDiff + ' XP';
				}
				if(coinDiff != null && coinDiff > 0){
					message += (message.length > 0? ', ': '');
					message += coinDiff + ' BlueCash';
				}
				if(message.length > 0)
					message = 'You have been awarded: ' + message;
				
				if(xpLevel != null && xpLevel > 0){
					message = message.length > 0? (message + ' and '): 'You have ';
					message += 'achieved level ' + xpLevel;
				}
				if(message.length > 0){
					message = "Congratulations!! " + message;
					this._showNotification(message);
				}
			},
			
			/*
			 * check if user has more mission 'accepted' or 'completed'
			 */
			_checkNewMission : function(missions){
				//check new mission
				if(missions != null && missions.length > 0){
					var completedMission = [];
					var newMissions = [];
					
					//build map for fast access
					var oldMission = {};
					if(this.mission != null){
						for(var i=0; i<this.mission.length; i++){
							oldMission[this.mission[i].id] = this.mission[i];
						}
					}
					
					for(var i=0; i<missions.length; i++){
						if(missions[i].currentState == 'accepted'){
							if(!oldMission[missions[i].id] || oldMission[missions[i].id].currentState == 'started'){
								newMissions.unshift(missions[i]);
							}
						}else if(missions[i].currentState == 'completed'){
							if(!oldMission[missions[i].id] || oldMission[missions[i].id].currentState == 'accepted'){
								completedMission.unshift(missions[i]);
							}
						}
					}
					if(completedMission != null && completedMission.length > 0){
						var message = "";
						for(var i=0; i<completedMission.length; i++){
							message += (i>0 ? ", ": "") + '"' + completedMission[i].label + '"';
						}
						message = 'Congratulations!! You have completed following mission(s): ' + message; 
						this._showNotification(message);
					}
					if(newMissions != null && newMissions.length > 0){
						var message = "";
						for(var i=0; i<newMissions.length; i++){
							message += (i>0 ? ", ": "") + '"' + newMissions[i].label + '"';
						}
						message = 'You have received the following mission(s): ' + message; 
						this._showNotification(message);
					}
				}
			},
			
			/*
			 * show notification popup
			 */
			_showNotification: function(message){
				var params = {};
				params.message = message;
				params.containerDivId = "gamebarNotificationDiv";
				params.fade = true;
				params.displayCloseIcon = true;
				var message = new gameNotification(params);
			},
			
			/*
			 * get variable definition by var name
			 */
			_getVarByName: function(name){
				for(qName in this.varMeta){
					if(this.varMeta[qName].name === name)
						return this.varMeta[qName];
				}
				return null;
			},
			
			/*
			 * function used for progress popup
			 */
			_getProgressPopupText: function(){
				var level = 0;
				var diff = 0;
				var title = null;
				var score = null;
				if(this.user.varValues != null && this.user.varValues[this.xpVarQName] != null){					
					score = this.user.varValues[this.xpVarQName];
					level = score.level;
					diff = parseInt((score.nextLevelThreshold - score.value));
					title = score.currentLevelTitle;
				}
				function highlight(text){
					return '<span style="color:green">' + text + '</span>';
				}
				return 'You are ' + highlight('Level ' + level) + ' with ' + highlight(score.value) + ' experience points.' +
						(gameUtil.isEmptyWithDefault(title)? '': 'Your title is ' + highlight(title) + '.') +  
						'There are ' + highlight(diff + ' points') + ' until level ' + (level + 1) + '.';
			},
			
			/*
			 * format current status regarding to the deed
			 */
			_formatEarnedText: function(label, type, value){
				if(type == 'level'){
					return label + ' reached level: ' + value;
				}else{
					return label + ' earned: ' + value;
				}
			},
			
			/*
			 * format requirement regarding to the deed
			 */
			_formatRequireText: function(currentValue, op, label, type, criteria){
				var diff = currentValue - criteria;
				if(type == 'level'){
					if(op === '<='){
						if(diff <= 0)
							return '';
					}else{
						if(diff >= 0)
							return '';
					}
					return label + ' reach level ' + criteria;
				}else{
					if(op === '<='){
						if(diff <= 0)
							return '';
						return Math.abs(diff) + ' less ' + label;
					}else{
						if(diff >= 0)
							return '';
						return Math.abs(diff) + ' more ' + label;
					}
				}
			},
			
			/*
			 * used to hide all popup
			 */
			_hideAllVisablePopupForMobile: function(){
				for(var i=0; i<this.popups.length; i++){
					if(this.popups[i].isVisible()){
						this.popups[i].hide();
					}
				}
			},

			/*
			 * save user's data to browser's local store
			 */
			_saveDataToStore: function(){
				if(typeof(Storage) !== "undefined") {
					sessionStorage.setItem('bluemix_g', JSON.stringify({user:this.user, mission:this.mission}));
				}
			},
			
			/*
			 * load user's data to browser's local store
			 */
			_loadDataFromLocalStore: function(user) {
				if(typeof(Storage) !== "undefined") {
					if(sessionStorage.getItem('bluemix_g')) {
						try{
							var data = JSON.parse(sessionStorage.getItem('bluemix_g'));
							if(data && data.user){						
								if(user.id === data.user.id){						
									this.user = data.user;
									this.mission = data.mission;
								}
							}							
						}catch(err){
							sessionStorage.removeItem('bluemix_g');
						}
					}
				}
			}
			
		});	 
});