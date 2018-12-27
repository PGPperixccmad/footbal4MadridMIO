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
 * Utilities
 */
define(["dojo/_base/lang", "dojo/window"],
    function(lang, window){
	
	return {		

		config: function(arguments){
			lang.mixin(this, arguments);			
		},
		
		/*
		 * format the point of mission
		 */
		formatMissionPoint : function (pointObjValue){
			if(pointObjValue.attr == null)
				return pointObjValue;
			else
				return (pointObjValue.attr === 'value'? (pointObjValue.op + pointObjValue.value): '');
		},
		
		/*
		 * replace new line characters to other string
		 */
		escapeNewLine: function(string, replaceStr){
			return this.isEmpty(string)? '':string.replace(/\\r\\n|\\n|\\r/g,replaceStr);
		},

		/*
		 * escape new line for title
		 */
		escapeNewLine4Title: function(string){
			return this.escapeNewLine(string, "&#013");
		},

		/*
		 * change new line character to hmtl '<br/>' tag
		 */
		escapeNewLine4Html: function(string){
			return this.escapeNewLine(string, "<br/>");
		},
		
		/*
		 * destroy child nodes & possibly itself
		 */
		destroyChildren : function(node, includeSelf){
			var list = dojo.query(node).children();
			while(list.length > 0){
				dojo.destroy(list.shift());
			};
			if(includeSelf === true){
				dojo.destroy(node);
			}
		},
		
		//check if a dom object visible
		isVisible: function(dom){
			var box = dojo.marginBox(dom);
			return box.h > 0 && box.w > 0;
		},

		/*
		 * return defaultValue if string is empty otherwise return string
		 */
		isEmptyWithDefault: function(string, defaultValue){
			if(this.isEmpty(string)){
				return defaultValue;
			}
			return string;
		},

		/*
		 * check if the string is null or empty
		 */
		isEmpty: function(string){
			return (string == null || string.trim() === '');
		},
		
		/*
		 * get the parameters of a url string. return a map with parameter name as key and parameter value as value
		 */
		getUrlParameters: function(url){
			var regex = /[\?|\&]([^=]+)\=([^&]+)/g;
			var result={};
			for(;;){				
				var match = regex.exec(url);
				if(!match) break;
				result[match(1)]=match(2);
			}
			return result;
		},
		
		/*
		 * dynamically align an element horizontal center in a view port  
		 */
		horizontalCenterInViewport: function(element){
			var vs = window.getBox();
			var ele = dojo.marginBox(element);
			dojo.style(element, 'position', 'fixed');
			dojo.style(element, 'left', ((vs.w-ele.w)/2) + 'px');
		}
		
		/*
		formatDeedAwardNotification: function(deedType, labels){
			return "Congratulations!! Following " + deedType + " have been awarded for you:" + joinNotificationLables(labels);
		},

		formatVariableAwardNotification: function(varDef, value, level){
			return "Congratulations!! You have been awarded " + value + " " + varDef.lable + (level ? (" and achieved level " + level): "");
		},

		formatCompleteMissoinNotification: function(labels){
			return "Congratulations!! You have completed following mission(s): " + joinNotificationLables(labels);
		},

		formatAcceptMissoinNotification: function(labels){
			return "Note!! You have received the following mission(s): " + joinNotificationLables(labels);
		},
		
		joinNotificationLables: function(labels){
			var labelStr = '';
			for(var i=0; i<labels.length; i++){
				labelStr += (i>0 ? ", ": "") + '"' + labels[i] + '"';
			}
			return labelStr;
		}
		*/

    };
});