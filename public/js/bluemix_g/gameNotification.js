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
 * Widget to display notification
 */
define("bluemix_g/gameNotification", 
		[
		 "dojo/_base/declare",
		 "dijit/_WidgetBase", 
		 "dijit/_TemplatedMixin",
		 "dojo/_base/lang",
		 "dojo/text!./templates/gameNotification.html",
		 "dojo/NodeList-traverse"
		],
    function(
	    		declare, 
	    		_WidgetBase,
	    		_TemplatedMixin, 
	    		lang,
	    		template
    		){
	 return declare([_WidgetBase, _TemplatedMixin],{
		 
		 	templateString: template,
		    
		 	widgetsInTemplate: true,

			containerDivId : "gamebarNotificationDiv",
			
		    message: null,
			
			img_src: dojo.moduleUrl("bluemix_g", "images/notification.png"),

		    timeout: 5000,
			
		    timer: null,
				
			width: null,
			
			fade: true,
			
			displayCloseIcon: false,

			/*
			 * create container to store all notification popup
			 */
			createContainer: function(){
				if(dojo.byId(this.containerDivId)){
					this.container = dojo.byId(this.containerDivId);
					this.container.className = 'bpmg_stat-notification';
				} else {
					this.container = dojo.create('div', {
						'id': this.containerDivId,
						'class': 'bpmg_stat-notification'
					}, dojo.body());
				}
			},
			
			createIconImage:function(){
				var image = document.createElement('img');
				image.src = this.img_src;
				dojo.addClass(image, "bpmg_stat-notification-avatar");
				this.icon.appendChild(image);
			},
			
			/*
			 * called when widget initialized
			 */
		    postCreate: function() {
				this.createContainer();
					
				dojo.style(this.domNode, 'opacity', 0);
				dojo.place(this.domNode, this.container);
				dojo.anim(this.domNode, {opacity: 1}, 250);
				
				if(this.width){
					dojo.style(this.domNode, 'width', this.width + 'px');
				}

				if(this.displayCloseIcon===false){
					dojo.style(this.closeIcon, 'display', 'none');
				}
				
				if(this.img_src)	{
					this.createIconImage();
				}
				
				if(this.fade===true){
					this.setTimer();
				}
			},
			
			/*
			 * set timer to cause widget vanished
			 */
			setTimer: function() {
				this.timer = setTimeout(dojo.hitch(this, 'close'), this.timeout);
			},
			
			/*
			 * triggered when mouse over of the widget
			 */
			_doMouseOver: function(e){
				clearInterval(this.timer);
				dojo.addClass(this.domNode, 'hover');
			}, 
			
			/*
			 * triggered when mouse out of the widget
			 */
			_doMouseOut:function(e){
				dojo.removeClass(this.domNode, 'hover');
				this.setTimer();
			},
			
			/*
			 * triggered when mouse over close icon
			 */
			_doIconMouseOver: function(e){
				dojo.addClass(this.closeIcon, 'hover');		
			},
			
			/*
			 * triggered when mouse out close icon
			 */
			_doIconMouseOut: function(e){
				dojo.removeClass(this.closeIcon, 'hover');
			},
			
			/*
			 * triggered when click close icon
			 */
			_doIconClick: function(e){
				this.close();
			},
			
			/*
			 * call remove function to remove this widget
			 */
			close: function(){
				dojo.anim(this.domNode,{opacity: 0}, 500, null, dojo.hitch(this, 'remove'));
			},
			
			/*
			 * remove this widget
			 */
			remove: function(){
				dojo.anim(this.domNode,{height: 0, margin: 0}, 250, null, dojo.partial(dojo.destroy, this.domNode));
			}
			
	 });
});
	
