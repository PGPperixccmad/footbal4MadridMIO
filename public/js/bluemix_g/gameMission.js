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
 * Mission popup widget which inherit gamePopup widget
 */
define("bluemix_g/gameMission", 
		[
		 "dojo/_base/declare",
		 "dojo/has",
		 "dojo/on",
		 "dojo/window",
		 "dojo/dom-geometry",
		 "bluemix_g/gameServiceAPI",
		 "bluemix_g/gameUtil",
		 "bluemix_g/gamePopup",
		 "dojo/mouse",
		 "dojox/gesture/swipe",
		 "dijit/_WidgetBase", 
		 "dijit/_TemplatedMixin",
		 "dojo/_base/lang",
		 "dojo/text!./templates/gameMission.html",
		 "dojox/widget/Rotator",
		 "dojo/NodeList-traverse",
		],
    function(
	    		declare,
	    		has,
	    		on,
	    		window,
	    		domGeometry,
	    		gameAPI,
	    		gameUtil,
	    		gamePopup,
	    		mouse,
	    		swipe,
	    		_WidgetBase,
	    		_TemplatedMixin, 
	    		lang,
	    		template,
	    		Rotator
    		){
	 return declare([_WidgetBase, _TemplatedMixin, gamePopup],{
		 
		 	proxyPath: '',
		 	
		 	planName: '',
		 	
		 	uid: null,
		 	
		 	xpVarQName: null,
		 	
		 	cashVarQName: null,
		 	
		 	missions: null,
		 	
		 	varMeta: null,
		 	
		 	templateString: template,
		    
		 	widgetsInTemplate: true,

		 	containerId : "gameMission",
						
			baseClass: 'gameMission',

			getData: null,

			/*
			 * called when widget initialized
			 */
			postCreate: function() {		    	
			    // Run any parent postCreate processes - can be done at any point
			    var _this = this;
			    this.inherited(arguments);
			    gameAPI.config({proxyPath:this.proxyPath, planName:this.planName});
			    if(has("touch")){			    	
			    	console.log('enable swipe & disable arrow');
			    	dojo.style(this.prevArrow, 'display', 'none');
			    	dojo.style(this.nextArrow, 'display', 'none');
			    	on(this.missionContainer, swipe.end, function(e){
			    		//alert("swipe");
			    		if(e.dx < 0){
			    			dojo.publish(_this.containerId + 'Rotator/rotator/control', ['next']);
			    		}else if(e.dx > 0){
			    			dojo.publish(_this.containerId + 'Rotator/rotator/control', ['prev']);
			    		}
			    	});
			    }
			},
			
			/*
			 * override the _refresh function
			 */
			_refresh: function(){
				var _this = this;
				if(this.getData && typeof this.getData === 'function'){
					var data = this.getData();
					this.missions = data.missions;
					this.varMeta = data.varMeta;
					_this._redraw();
				}else{
					gameAPI.getUser(this.uid, function(user){
						if(user)
							_this.missions = user.missions;
						_this._redraw();
					});					
				}
			},
			
			/*
			 * function to render the mission list
			 */
			_redraw: function(){
				var _this = this;
				gameUtil.destroyChildren(this.missionContainer);
				
				if(this.missions != null && this.missions.length > 0){
					var missionCount = 0;
					var lastMission = null;
					for(var i=0; i<this.missions.length; i++){
						//draw missions
						var mis = this.missions[i];
						var pointObj = {};
						if(!gameUtil.isEmpty(mis.note)){
							try{
								pointObj = dojo.fromJson(mis.note);
							}catch(err){
								//
							}
						}else{
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
													};;
												}else if(pointObj.blueCash == null && this.cashVarQName === varQname && varQname === varQname_f && attr === attr_f){
													pointObj['blueCash'] = {
															value: value_f,
															attr: attr_f,
															op: op_f
													};;
												}
											}catch(err){
											}
										}
									}
								}
							}
						}
						
						var missionRow = 
						'<div class="mission_row" style="width: 100%;">' +
						'<div class="mission_icon_col" title="' + mis.label + '">' + 
						'<div class="mission_icon mission_icon' + ((i+1)%3+1) + '">' + (i+1) + '</div><div class="mission_label">' + mis.label + '</div></div>' + 
						'<div class="mission_desc" title="' + gameUtil.escapeNewLine4Title(mis.description) + '">' + gameUtil.escapeNewLine4Html(mis.description) + '</div>' +
						'<div class="mission_impact_group">' + 
						(pointObj.blueCash != null? ('<div class="mission_blueCoin">' + gameUtil.formatMissionPoint(pointObj.blueCash) +'</div>'): '<div class="mission_blueCoin hide_background"></div>') +
						(pointObj.xp != null? ('<div class="mission_xp">' + gameUtil.formatMissionPoint(pointObj.xp) + 'XP</div>'): '<div class="mission_xp"></div>') +
						'</div></div>';
						dojo.place(missionRow, this.missionContainer, 'last');

						missionCount++;
						lastMission = mis;
					}
					new dojox.widget.Rotator(
							{
					            transition: "dojox.widget.rotator.pan"
					        },
					        dojo.byId(this.containerId + 'Rotator')
					);
											
				}else{
					dojo.place('<div class="no_data">No on-going missions</div>', this.missionContainer);
				}
			},
			
			/*
			 * uititly function get get variable definition by name
			 */
			_getVarByName: function(name){
				for(qName in this.varMeta){
					if(this.varMeta[qName].name === name)
						return this.varMeta[qName];
				}
				return null;
			},
			
	 });
});
	
