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
 * Leaderboard popup widget which inherit gamePopup widget
 */
define("bluemix_g/gameLeaderboard", 
		[
		 "dojo/_base/declare",
		 "bluemix_g/gameServiceAPI",
		 "bluemix_g/gameUtil",
		 "bluemix_g/gamePopup",
  		 "dojo/topic",
		 "dojo/mouse",
		 "dojox/widget/Standby",
		 "dijit/_WidgetBase", 
		 "dijit/_TemplatedMixin",
		 "dojo/_base/lang",
		 "dojo/text!./templates/gameLeaderboard.html",
		 "dojo/NodeList-traverse"
		],
    function(
	    		declare, 
	    		gameAPI,
	    		gameUtil,
	    		gamePopup,
	    		topic,
	    		mouse,
	    		Standby,
	    		_WidgetBase,
	    		_TemplatedMixin, 
	    		lang,
	    		template
    		){
	 return declare([_WidgetBase, _TemplatedMixin, gamePopup],{
		 
		 	gameAPI: null,

		 	uid: null,
		 	
		 	varName: null,
		 	
		 	varQName: null,
		 	
		 	// data that pass to leaderboard api to query data
			leaderBoard: {
				varName: null, //set later
				leaderBoardPageCount: 4,
				leaderBoardStart: 1,
				leaderBoardLast: 0,
				data: null
			},

		 	formatName: null,
		 	
		 	setUserPicUrl: null,
		 	
		 	templateString: template,
		    
		 	widgetsInTemplate: true,

			containerId : "gameLeaderboard",
			
			baseClass: 'gameLeaderboard',
			
			scrolling : false,
			
			inited: false,
			
			standby: null,
			
			/*
			 * called when widget initialized
			 */
		    postCreate: function() {
			    // Run any parent postCreate processes - can be done at any point
		    	var _this = this;
			    this.inherited(arguments);		
			    
			    //set the varName that will be used by API
			    this.leaderBoard.varName = this.varName;
			    
				window.onresize = function(){
					_this._onResize();
				};
				
				dojo.connect(this.rowContainer, 'onscroll', function(){
					if(!_this.scrolling 
							&& _this.leaderBoard.leaderBoardLast < _this.leaderBoard.data.totalCount 
							&& (_this.rowContainer.scrollHeight - _this.rowContainer.offsetHeight <= _this.rowContainer.scrollTop + 10)){ //20 is half height of one row
						_this.scrolling = true;
						_this._fetchNext();
					}
				});
				this.standby = new Standby({
                    id : "gameLeaderboardStandby",
                    target : _this.rowContainer,
                });
                document.body.appendChild(this.standby.domNode);
                this.standby.startup();
			},
			
			/*
			 * called whey window resized
			 */
			_onResize: function(){
			    this.inherited(arguments);			    				
				var all = dojo.contentBox(this.domNode);
				dojo.style(this.rowContainer, 'height', parseInt(all.h) + 'px');
				
			},
			
			/*
			 * function to fetch/render data for next page
			 */
			_fetchNext: function(){
				var _this = this;
				_this.standby.show();
				gameAPI.getLeaderBoard(_this.uid, true, _this.leaderBoard, function(data){						
					_this._addRows(data);
					_this.scrolling = false;
					_this.standby.hide();
				});
			},
			
			/*
			 * function to fetch/render data for previous page
			 */
			_fetchPrev: function(){
				var _this = this;
				gameAPI.getLeaderBoard(_this.uid, false, _this.leaderBoard, function(){						
					_this._refresh();
				});
			},
			
			/*
			 * override the _refresh function
			 */
			_refresh: function(){
				if(!this.inited){					
					var _this = this;
					gameAPI.getLeaderBoard(_this.uid, null, _this.leaderBoard, function(){
						_this._redraw();
						_this.rowContainer.scrollTop = 0;
					});
					this.inited = true;
				}
			},

			/*
			 * function to add entries to leader board
			 */
			_addRows: function(){
				var _this = this;
				var leaderBoardData = _this.leaderBoard.data.participants;
				if (leaderBoardData != null) {
					// find max
					var max = _this.leaderBoard.data.maxValue;

					for ( var i = 0; i < leaderBoardData.length; i++) {
						// add row
						var isHighlight = false;
						var userName = this.formatName(leaderBoardData[i].userFirstName, leaderBoardData[i].userLastName, leaderBoardData[i].uid);
						var userNameShort = this._cutUserName(userName, 20);
						var rowDom = dojo.place('<div class="point_row" title="' + userName + '"></div>', this.leaderBoardRow, "last");
						var avatar = dojo.place('<div class="avatar_container"><img class="leaderBoard_avatar" src="' + this._getPicUrl(leaderBoardData[i].uid) + '"/></div>', rowDom);
							
						isHightlight = leaderBoardData[i].uid == this.uid;
						// Add name
						var percent = Math.round((leaderBoardData[i].value / max) * 100);
						var barContainerDom = dojo.place('<div class="point_bar_container" title="rank:' + leaderBoardData[i].rank + ' / ' + leaderBoardData[i].value + 'pt"></div>', rowDom, "last");
						var id = 'bpmg_leaderBoard_' + i;
						var pointBarDom = dojo.place('<div id="' + id 
										+ '" class="' + (isHightlight ? 'point_bar_highlight' : 'point_bar')
										+ '" style="width:' + percent + '%' 
										+ '"></div>', barContainerDom, "last");
						var nameDom = dojo.place('<div class="point_name">' + userNameShort + '</div>', rowDom, "last");
					}
					
				}
				if(_this.leaderBoard.leaderBoardLast < _this.leaderBoard.data.totalCount){
					dojo.style(this.moreRow, 'display', 'block');
					var moreRowHeight = dojo.style(this.rowContainer, 'height') - dojo.style(this.leaderBoardRow, 'height'); 
					dojo.style(this.moreRow, 'height', (moreRowHeight + 20) + 'px');
				}else{
					dojo.style(this.moreRow, 'display', 'none');
				}
			},

			/*
			 * destroy all the content and re-render leader board
			 */
			_redraw: function(){
				var _this = this;
				gameUtil.destroyChildren(this.leaderBoardRow);
				this._addRows(this.leaderBoard);
			},

			/*
			 * function to render user's picture
			 */
			_getPicUrl: function(uid){
				var picSrc = this.proxyPath + 'service/plan/' + this.planName + '/user/' + uid + '/pic';
				if(this.setUserPicUrl != null && typeof(this.setUserPicUrl) === "function"){
					var newPicSrc = this.setUserPicUrl(uid);
					if(newPicSrc != null && typeof newPicSrc === 'string')
						picSrc = newPicSrc;
				}
				return picSrc;
			},
			

			/*
			 * function to truncate user's name
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
			}
	 });
});
	
