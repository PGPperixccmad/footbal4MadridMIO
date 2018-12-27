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
 * Badge popup widget which inherit gamePopup widget
 */
define("bluemix_g/gameBadge", 
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
		 "dojo/text!./templates/gameBadge.html",
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
		 	
		 	deedMeta: null,
		 	
		 	varMeta: null,
		 	
		 	user: null,
		 	
		 	templateString: template,
		    
		 	widgetsInTemplate: true,

			containerId : "gameBadge",
			
			baseClass: 'gameBadge',
			
			getData: null,
			
			/*
			 * called when widget initialized
			 */
			postCreate: function() {
			    var _this = this;
			    this.inherited(arguments);
			    gameAPI.config({proxyPath:this.proxyPath, planName:this.planName});
			    if(has("touch")){			    	
			    	console.log('enable swipe & disable arrow');
			    	dojo.style(this.prevArrow, 'display', 'none');
			    	dojo.style(this.nextArrow, 'display', 'none');
			    	on(this.badgeContainer, swipe.end, function(e){
			    		if(e.dx < 0){
			    			dojo.publish(_this.containerId + 'Rotator/rotator/control', ['next']);
			    		}else if(e.dx > 0){
			    			dojo.publish(_this.containerId + 'Rotator/rotator/control', ['prev']);
			    		}
			    	});
			    }
			},
			
			_refresh: function(){
				/*
				 * override the _refresh function
				 */
				var _this = this;
				if(this.getData && typeof this.getData === 'function'){
					var data = this.getData();
					this.deedMeta = data.deedMeta;
					this.varMeta = data.varMeta;
					this.user = data.user;
					_this._redraw();
				}else{
					gameAPI.getUser(this.uid, function(user){
						if(user)
							_this.user = user;
						_this._redraw();
					});					
				}
			},
			
			/*
			 * function to render the content
			 */
			_redraw: function(){
				var _this = this;
				gameUtil.destroyChildren(this.badgeContainer);

				var badgeMeta = [];
				//only show badge
				for(var i=0; i<this.deedMeta.length; i++){
					var meta = this.deedMeta[i];
					if(meta.type === 'badge')
						badgeMeta.push(meta);
				}
				
				if(badgeMeta != null && badgeMeta.length > 0){
					//[label, deedInfo{type(s/g), deeds}]
					//deeds is {meta, criterias[{var, attr, op, criteriaValue}]}
					//label is meta.name 
					var deedGroupMap = {};
					for(var i=0; i<badgeMeta.length; i++){
						var meta = badgeMeta[i];
						
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
					for(var key in deedGroupMap){
						var deedInfo = deedGroupMap[key];
						//should be single
						var deed = deedInfo.deeds;
						var deedRow = dojo.place('<div class="deed_row"></div', this.badgeContainer, "last");
						var iconContainer = dojo.place('<div class="deed_icon_container"></div', deedRow, "last");
						var cls = 'badge_empty';
						var awarded = false;
						if(this.user.userDeeds[deed.meta.qualifiedName] != null && this.user.userDeeds[deed.meta.qualifiedName].deedValue == 'Y'){
							latestDeed = deed;
							cls = "badge_gold";
							deed.displayClass = cls;								
							awarded = true;
						}
						var imageShowed = false;
						if('base64' === deed.meta.imageType){
							if(!gameUtil.isEmpty(deed.meta.imageBase64)){
								var icon = dojo.place('<image class="deed_icon" title="' + gameUtil.escapeNewLine4Title(deed.meta.description) +'" src="data:image/png;base64,' +
										deed.meta.imageBase64
										+ '"/>', iconContainer, "first");
								dojo.style(icon, 'width', 'auto');
								imageShowed = true;
							}
						}else if('url' === deed.meta.imageType){
							if(!gameUtil.isEmpty(deed.meta.imageUrl)){
								if(!gameUtil.isEmpty(deed.meta.imageUrlPos)){
									var icon = dojo.place('<div class="deed_icon" title="' + gameUtil.escapeNewLine4Title(deed.meta.description) +'"></div>', iconContainer, "first");
									dojo.style(icon, 'backgroundImage', 'url(' + deed.meta.imageUrl + ')');
									var imagePos = JSON.parse(deed.meta.imageUrlPos, true);
									dojo.style(icon, 'backgroundSize', 'initial');
									dojo.style(icon, 'backgroundPosition', '-' + imagePos.x + 'px -' + imagePos.y + 'px');
									var containerHeight = dojo.style(icon, 'height');
									var ratio = containerHeight*0.9 / imagePos.h;
									dojo.style(icon, 'width', imagePos.w + 'px');
									dojo.style(icon, 'height', imagePos.h + 'px');
									dojo.style(icon, '-msTransform', 'scale(' + ratio  + ')');
									dojo.style(icon, '-webkitTransform', 'scale(' + ratio  + ')');
									dojo.style(icon, 'transform', 'scale(' + ratio  + ')');
									var margin = containerHeight - imagePos.h;
									if(margin < 0){										
										dojo.style(icon, 'margin', margin + 'px ' + ' auto');
									}
								}else{									
									var icon = dojo.place('<image class="deed_icon" title="' + gameUtil.escapeNewLine4Title(deed.meta.description) +'" src="' +
											deed.meta.imageUrl
											+ '"/>', iconContainer, "first");
									dojo.style(icon, 'width', 'auto');
								}
								imageShowed = true;
							}
						}
						if(!imageShowed){
							dojo.place('<div class="deed_icon ' + cls + '" title="' + gameUtil.escapeNewLine4Title(deed.meta.description) +'"></div>', iconContainer, "first");
						}
							
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
					
					new dojox.widget.Rotator(
							{
								transition: "dojox.widget.rotator.pan"
					            //transition: "dojox.widget.rotator."
					        },
					        dojo.byId(this.containerId + 'Rotator')
					);
											
				}else{
					dojo.place('<div class="no_data">No badges</div>', this.badgeContainer);
				}
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
			 * uititly function get get variable definition by name
			 */
			_getVarByName: function(name){
				for(qName in this.varMeta){
					if(this.varMeta[qName].name === name)
						return this.varMeta[qName];
				}
				return null;
			}			
	 });
});
