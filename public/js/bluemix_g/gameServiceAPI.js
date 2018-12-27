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
 * library to invoke gamification services
 */
define([
        "dojo/_base/lang",
        "dojo/json",
        "dojo/cookie",
        "dojo/_base/connect",
        'dojox/cometd'
        ],
    function(lang, JSON, cookie, connect, cometd){
	
	return {		
		proxyPath: '/proxy/',
		planName: null,

		//used for proxy-free mode
		connectMode: 'proxy', //can be proxy or direct
		apiProtocol: null,
		apiHost: null,
		apiPort: null,
		tempKey: null,
		
		//flag
		cometdConnected: false,
		
		//cometd handler
		cometdHandler: null,

		/*
		 * function to initiate the library
		 */
		config: function(arguments){
			var _this = this;
			lang.mixin(this, arguments);
			cometd.websocketEnabled = false; //disable websocket as Game Service is not support it yet
			if(_this.connectMode === 'direct'){				
				cometd.configure({
					url: _this.apiProtocol + '://' + _this.apiHost + ':' + _this.apiPort + '/cometd',
					logLevel: 'info'
				});
			}else{
				cometd.configure({
					url: _this.proxyPath + 'cometd',
					logLevel: 'info'
				});
			}
			this.handleCometDConnect();
		},
		
		/*
		 * To get the leader board data
		 * isNext - if first time call set to false, otherwise set to true 
		 * leaderBoardData has following attributes
		 * varName - variable name for the leaderboard
		 * leaderBoardPageCount - entries per page in leader board
		 * leaderBoardStart - indicate start index of current page, will be updated
		 * leaderBoardLast - indicate end index of current page, will be updated
		 * data - leader board data returned from gamification service, will be updated
		 */
		getLeaderBoard : function(uid, isNext, leaderBoardData, successCallback, failedCallback){
			var queryString = '&count=' + leaderBoardData.leaderBoardPageCount;
			if(leaderBoardData.leaderBoardStart == null){
				queryString += '&uid=' + this.uid;
			}else{
				if(isNext != null){
					queryString += '&start=' + (leaderBoardData.leaderBoardStart + (isNext? (+leaderBoardData.leaderBoardPageCount) : (-leaderBoardData.leaderBoardPageCount)));
				}else{
					queryString += '&start=' + leaderBoardData.leaderBoardStart;
				}
			}
			this.getResource('service', 'user/' + uid + '/leaderboard?varName=' + leaderBoardData.varName + queryString, function(result){
				if(result.participants == null || result.participants.length === 0){
					leaderBoardData.leaderBoardStart = null;
				}else{
					leaderBoardData.leaderBoardStart = result.participants[0].sid;
					leaderBoardData.leaderBoardLast = result.participants[result.participants.length-1].sid;
				}
				leaderBoardData.data = result;
				successCallback(leaderBoardData);
			}, failedCallback);
		},
		
		/*
		 * create session with supplied tempKey
		 */
		createSession: function(tempKey, successCallback, failCallback){
			var data = {"key": tempKey};
			this.sendResource("post", 'service/plan/' + this.planName + '/tempKey/session', data, function(){
				successCallback();
			}, function(){
				failCallback();
			}, false);
		},
		
		/*
		 * delete current session
		 */
		deleteSession: function(tempKey, successCallback, failCallback){
			var data = {"key": tempKey};
			this.sendResource("delete", 'service/plan/' + this.planName + '/tempKey/session', data, function(){
				successCallback();
			}, function(){
				failCallback();
			}, false);
		},
		
		/*
		 * start cometD connection
		 */
		startCometD: function(uid){
			if(this.cometdHandler){
				return;
			}
			var _this = this;
			this.cometdHandler = cometd.addListener('/meta/handshake', function(message){
				if (message.successful){
					console.log('CometD handshake successful');
					cometd.subscribe('/user', function(response){
						connect.publish('user', response);
					});
				}else{
					console.log('CometD handshake failed, code=' + message.ext.code + ', reason=' + message.ext.reason);
					//check error code
					if(message.ext.code === 401){
						//temp key expired or somehow invalid, get a new one from server
					}
				}
			});
			
			if(_this.connectMode === 'direct'){		
				cometd.handshake({
					ext:{
						key : _this.tempKey
					}
				});
			}else{
				cometd.handshake({
					ext:{
							uid: uid,
							planName: _this.planName
						}
					});
			}
		},
		
		/*
		 * handle comentd connection status changes
		 */
		handleCometDConnect: function(){
			var _this = this;
			cometd.addListener('/meta/connect', function(message)
			{
			    if (cometd.isDisconnected())
			    {
			    	_this.setCookie(false);
			        return;
			    }

			    var wasConnected = _this.cometdConnected;
			    _this.cometdConnected = message.successful;
			    if (!wasConnected && _this.cometdConnected)
			    {
			        // Reconnected
			    	_this.setCookie(true);
			    	connect.publish('connect', true);
			    }
			    else if (wasConnected && !_connected)
			    {
			        // Disconnected
			    	_this.setCookie(false);
			    	connect.publish('connect', false);
			    }
			});

			cometd.addListener('/meta/disconnect', function(message)
			{
			    if (message.successful)
			    {
			    	_this.cometdConnected = false;
			    	_this.setCookie(false);
			    }
			});
		},
		
		/*
		 * get user's profile including mission status
		 */
		getUser: function(uid, successCallback, failedCallback){
			this.getResource('service', 'user/' + uid + "?extraInfo=MISSION_STATE,ONGOING_MISSION", successCallback, failedCallback);
		},

		/*
		 * get all variable definition
		 */
		getAllMetaVar: function(successCallback, failedCallback){
			this.getResource('service', 'var', successCallback, failedCallback);
		},

		/*
		 * get all deed definition
		 */
		getAllDeedMeta: function(successCallback, failedCallback){
			this.getResource('service', 'deed', successCallback, failedCallback);
		},
		
		/*
		 * get user's mission history
		 */
		getMission: function(uid, successCallback, failedCallback){
			this.getResource('trigger', 'mission?uid=' + uid + '&currentState=completed,accepted,started', successCallback, failedCallback);
		},
		
		/*
		 * base function to call gamification service with POST/PUT method
		 */
		sendResource: function(method, restUri, data, successCallback, failCallback, isSync){
			var _this = this;
			var resourceRoot = this.proxyPath;
			var params = {};
			if(this.connectMode === 'direct'){
				resourceRoot = this.apiProtocol + '://' + this.apiHost + ':' + this.apiPort + '/';
				params = {key: _this.tempKey};
			}
			var para = {
					url: resourceRoot + restUri,
					postData: JSON.stringify(data),
					headers : {"Content-Type" : "application/json", "accept":"application/json"},
					withCredentials: true,
					handleAs: "json",
					content: params,
					sync: ((isSync == null || isSync)? true: false),
					preventCache: false,
					load: function(data, ioargs){
						if(_this.connectMode === 'direct')
							_this.setCookie(true);
						successCallback(data, ioargs);
					},
					error: function(error) {
						if(_this.connectMode === 'direct')
							_this.setCookie(false);
						console.log("An unexpected error occurred: " + error);
						if(failCallback != null){
							failCallback(error, ioargs);
						}
	                }
				};
			if(method === 'post'){
				dojo.xhrPost(para);					
			}else if(method === 'put'){
				dojo.xhrPut(para);										
			}else if(method === 'delete'){
				dojo.xhrDelete(para);
			}
		},
		
		/*
		 * base function to call gamification service with POST/PUT method
		 */
		getResource: function(resourceType, resourceUri, successCallback, failedCallback){
			var _this = this;
			var resourceRoot = this.proxyPath;
			var params = {};
			if(this.connectMode === 'direct'){
				resourceRoot = this.apiProtocol + '://' + this.apiHost + ':' + this.apiPort + '/';
				params = {key: _this.tempKey};
			}
			
			dojo.xhrGet({
				url: resourceRoot + resourceType + '/plan/' + this.planName + '/' + resourceUri,
				headers : {"Content-Type" : "application/json", "accept":"application/json"},
				handleAs: "json",
				sync: false,
				content: params,
				withCredentials: true,
				preventCache: true,
				load: function(result){
					try{							
						if(_this.connectMode === 'direct')
							_this.setCookie(true);
						successCallback(result);
					}catch(err){
						console.log(err.stack);
					}
				},
				error: function(error, ioargs){
					if(_this.connectMode === 'direct')
						_this.setCookie(false);
					console.log("An unexpected error occurred: " + error);
					if(failedCallback != null){
						failedCallback(error, ioargs);
					}
				}
			});
		},
				
		/*
		/ set cookie indicate if the connection is lost due to login failed, session timed out, etc. used only for 'direct' connect mode
		*/
		setCookie : function(success){
			if(this.connectMode === 'direct') cookie('_bluemix_g_connect', success? true: false);
		},
		
		/*
		 * update user's default title
		 */
		updateDefaultTitle : function(uid, titleName, successCallback, failCallback){
			var data = {titleName: titleName};
			this.sendResource("put", 'service/plan/' + this.planName + '/user/' + uid + '/defaultTitle', data, successCallback, failCallback, false);
		},

		/*
		 * update user's picture
		 */
		updateAvatar : function(uid, imageBase64, successCallback, failCallback){
			var data = {pic: imageBase64};
			this.sendResource("put", 'service/plan/' + this.planName + '/user/' + uid + '/pic', data, successCallback, failCallback, false);
		},


    };
});