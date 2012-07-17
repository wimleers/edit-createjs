define([
    'aloha/core',
    'jquery',
    'aloha/contenthandlermanager',
    'aloha/console',
    'vendor/sanitize'
    ],
function( Aloha,
            jQuery,
            ContentHandlerManager,
            console ) {
	"use strict";

	var sanitize, setting = {};

	// very restricted sanitize config
	setting.restricted = {
		elements: [ 'b', 'em', 'i', 'strong', 'u', 'del', 'p', 'span', 'div', 'br' ]
	}

	// basic sanitize config
	setting.basic = {
		elements: [
			'a', 'abbr', 'b', 'blockquote', 'br', 'cite', 'code', 'dd', 'del', 'dl', 'dt', 'em',
			'i', 'li', 'ol', 'p', 'pre', 'q', 'small', 'strike', 'strong', 'sub',
			'sup', 'u', 'ul' ],

		attributes: {
			'a' : ['href'],
			'blockquote' : ['cite'],
			'q' : ['cite'],
			'abbr': ['title']
		},

		protocols: {
			'a' : {'href': ['ftp', 'http', 'https', 'mailto', '__relative__']},
			'blockquote' : {'cite': ['http', 'https', '__relative__']},
			'q' : {'cite': ['http', 'https', '__relative__']}
		}
	}

	function initSanitize () {
		var config;

        config = this.setting.basic;

		// add a filter to stop cleaning elements with contentEditable "false"
		config.filters = [function( elem ) {
			return elem.contentEditable != "false";
		}];
		sanitize = new Sanitize( config );
	}

	var DrupalContentHandler = ContentHandlerManager.createHandler({
		/**
		 * Handle the content from eg. paste action and sanitize the html
		 * @param content
		 */
		handleContent: function( content )  {
			// sanitize does not work in IE7. It tries to set the style attribute via setAttributeNode() and this is know to not work in IE7
			// (see http://www.it-blogger.com/2007-06-22/microsofts-internetexplorer-und-mitglied-nicht-gefunden/ as a reference)
			if (jQuery.browser.msie && jQuery.browser.version <= 7) {
				return content;
			}

			// dynamic allowed tags drupal sprint
			var dataAttr = Aloha.activeEditable.obj.closest('.edit-field').data();
			if ( dataAttr && dataAttr.editAllowedTags ) {
			    var allows = dataAttr.editAllowedTags.split(',');
			    var config = {};
			    config.elements = allows;

		        sanitize = new Sanitize( config );
			} else if ( typeof sanitize === 'undefined' ) {
			   initSanitize();
			}

			if ( typeof content === 'string' ){
				content = jQuery( '<div>' + content + '</div>' ).get(0);
			} else if ( content instanceof jQuery ) {
				content = jQuery( '<div>' ).append(content).get(0);
			}

			return jQuery('<div>').append(sanitize.clean_node(content)).html();
		}
	});

	return DrupalContentHandler;
});