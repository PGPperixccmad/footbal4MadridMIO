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
 * Base widget for popup
 */
define("bluemix_g/gamePopup", 
		[
		 "bluemix_g/gameUtil",
		 "dojo/_base/declare",
		 "dojo/on",
		 "dojo/window",
		 "dojo/dom-geometry",
		 "dojo/dom-class",
		 "dijit/_WidgetBase", 
		 "dijit/_TemplatedMixin",
		 "dojo/_base/lang",
		 "dojo/text!./templates/gamePopup.html",
		 "dojo/NodeList-traverse",
		],
    function(
    			gameUtil,
	    		declare,
	    		on,
	    		win,
	    		domGeometry,
	    		domClass,
	    		_WidgetBase,
	    		_TemplatedMixin, 
	    		lang,
	    		template,
	    		Rotator
    		){
	 return declare([_WidgetBase, _TemplatedMixin],{
		 
		 	templateString: template,
		    
		 	widgetsInTemplate: true,

			id : "",
			
			content: '',
			
			beforeShow: null,
			
			around: null, //the dom element that this popup should be place around

			/*
			 * called when widget initialized
			 */
			postCreate: function() {
		    	
				var _this = this;
			    this.inherited(arguments);

			    on(window, "resize", function(e){
					_this._onResize();
			    });
			},

			/*
			 * function to show the popup
			 */
			show: function(){
				if(this.beforeShow != null && typeof this.beforeShow === 'function'){
					this.beforeShow();
				}

				this._refresh();
				dojo.style(this.domNode, 'display', 'block');
				this._onResize();
			},
			
			/*
			 * function to hide the popup
			 */
			hide: function(){
				dojo.style(this.domNode, 'display', 'none');
			},
			
			/*
			 * function to toggle the visibility of popup
			 */
			toggle: function(){
				if(dojo.style(this.domNode, 'display') != 'none'){
					this.hide();
				}else{
					this.show();
				}
			},
			
			/*
			 * check is the popup is visible
			 */
			isVisible: function(){
				return gameUtil.isVisible(this.domNode);
			},
			
			/*
			 * refresh the content 
			 */
			_refresh: function(){
				gameUtil.destroyChildren(this.contentContainer);
				if(this.content){
					if(typeof this.content === 'function'){
						this.contentContainer.innerHTML = this.content();
					}else{
						this.contentContainer.innerHTML = this.content;
					}
				}
			},
						
			/*
			 * show the content when this popup is start
			 */
			startup: function(){
				this.show();
			},
			
			/*
			 * used to hookup the content method
			 */
			_setContentAttr: function(content){
				if(typeof content === 'function'){
					this.content = content();
				}else{					
					this.content = content;
				}
				this._refresh();
			},
			
			/*
			 * called when widow resized
			 */
			_onResize: function(){
				var elePos = domGeometry.position(this.around);
				var vs = win.getBox();
				var barOnBottom = elePos.y > vs.h/2; //true - gamebar in bottom, false - gamebar on top
				if(!barOnBottom){
					//change css if bar is on top
					domClass.remove(this.arrow, 'bpmg_stat_tooltip_dialog_arrow');
					domClass.add(this.arrow, 'bpmg_stat_tooltip_dialog_arrow_top');
				}
				
				//move arrow to the around element
				var arrowPos = domGeometry.position(this.arrow);
				var arrowLeft = elePos.x+elePos.w/2 - 6;
				dojo.style(this.arrow, 'left', arrowLeft + 'px');
				if(!barOnBottom){
					dojo.style(this.arrow, 'top', parseInt(elePos.y + elePos.h) + 'px');					
				}else{
					dojo.style(this.arrow, 'bottom', parseInt(vs.h - elePos.y) + 'px');					
				}
				
				//move dialog in vertical
				arrowPos = domGeometry.position(this.arrow);
				if(!barOnBottom){
					dojo.style(this.domNode, 'top', parseInt(arrowPos.y + 6) + 'px');
				}else{
					dojo.style(this.domNode, 'bottom', parseInt(vs.h - arrowPos.y) + 'px');
				}
				
				//move dialog in horizontal
				var domPos = domGeometry.position(this.domNode);
				if(arrowPos.x - domPos.w/2 < 0){
					dojo.style(this.domNode, 'left', '5px');
				}else if(arrowPos.x + domPos.w/2 > vs.w){
					dojo.style(this.domNode, 'left', parseInt(vs.w - domPos.w - 0) + 'px');
				}else{
					dojo.style(this.domNode, 'left', parseInt(arrowPos.x - domPos.w/2) + 'px');
				}
				dojo.style(this.domNode, 'opacity', 1);
			},
			
			/*
			 * triggered when close icon is clicked
			 */
			_doClose: function(){
				this.close();
			},
			
			/*
			 * simply hide the popup
			 */
			close:function(){
				this.hide();
			}
	 });
});
	
