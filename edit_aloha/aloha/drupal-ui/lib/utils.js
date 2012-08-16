define(['jquery', 'jqueryui'], function($) {
	'use strict';
	var Utils = {

		buttonDataIconsMapping: {
				'link': '&#xe002;',
				'bold': '&#xe035;',
				'strong': "&#xe034;",
				'italic': '&#xe00c;',
				'emphasis': '&#xe032;',
				'strikethrough': '&#xe00a;',
				'subscript': '&#xe039;',
				'superscript': '&#xe038;',
				'underline': '&#xe00b;',
				'strikethrough2': '&#xe00a;',
				'orderedlist': '&#xe009;',
				'unorderedlist': '&#xe006;',
				'p': '&#xe049;',
				'pre': '&#xe03c;',
				'h1': 'aloha-large-icon-h1',
				'h2': 'aloha-large-icon-h2',
				'h3': 'aloha-large-icon-h3',
				'h4': 'aloha-large-icon-h4',
				'h5': 'aloha-large-icon-h5',
				'h6': 'aloha-large-icon-h6',
				'indent': '&#xe008;',
				'outdent': '&#xe007;',
				'align-center': '&#xe042;',
				'align-justify': '&#xe048;',
				'align-right': '&#xe004;',
				'align-left': '&#xe005;',
				'characterpicker': '&#xe01a;'
		},

		// Source: http://stackoverflow.com/a/9609450.
		decodeEntities: (function() {
			// this prevents any overhead from creating the object each time
			var element = document.createElement('div');

			function decodeHTMLEntities (str) {
				if(str && typeof str === 'string') {
					// strip script/html tags
					str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
					str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
					element.innerHTML = str;
					str = element.textContent;
					element.textContent = '';
				}

				return str;
			}

			return decodeHTMLEntities;
		})(),

		makeButton: function(button, props, hasMenu) {
			button.button({
				label: Utils.makeButtonLabel(props),
				text: !!(props.text || props.html),
				icons: {
					primary: props.icon || (props.iconUrl && 'aloha-ui-inline-icon-container') || null,
					secondary: (hasMenu && 'aloha-jqueryui-icon ui-icon-triangle-1-s') || null
				}
			});

			// Edit: improved accessibility.
			button.button('widget')
				.find( '.ui-button-icon-primary' ).attr( 'aria-hidden', 'true' );

			// Edit: remove Aloha's class-based icons and override them with our
			// custom icons, using data- attributes.
			var primaryIcon = button.button( 'widget' )
				.find( '.ui-button-icon-primary' );
			if ( primaryIcon.hasClass('aloha-icon') ) {
				var classString = primaryIcon.attr( 'class' ),
						match,
						className = null,
						classNames = [],
						re = /aloha-icon-([\w\-]+)/gi;

				// Find all "aloha-icon-<something>" classes, and remember the most
				// specific match.
				while ( match = re.exec(classString) ) {
					className = match[1];
					classNames.push( className );
				}

				// If any match, override the icon.
				if ( className ) {
					var icon = Utils.buttonDataIconsMapping[className];
					var removeClassNames = classNames
						.map(function( c ) { return 'aloha-icon-' + c; })
						.join( ' ' );
					primaryIcon
						.removeClass( 'ui-icon' )
						.removeClass( 'aloha-icon' )
						.removeClass( removeClassNames )
						.addClass( 'spark-icon' )
						.attr( 'data-html-tag', className )
						.attr( 'data-icon', Utils.decodeEntities(icon) );
				}
			}

			if (props.iconUrl) {
				button.button('widget')
					  .children('.ui-button-icon-primary')
					  .append(Utils.makeButtonIconFromUrl(props.iconUrl));
			}
			return button;
		},
		makeButtonLabel: function(props) {
			// TODO text should be escaped
			return props.html || props.text || props.tooltip;
		},
		makeButtonLabelWithIcon: function(props) {
			var label = Utils.makeButtonLabel(props);
			if (props.iconUrl) {
				label = Utils.makeButtonIconFromUrl(props.iconUrl) + label;
			}
			return label;
		},
		makeButtonIconFromUrl: function(iconUrl) {
			return '<img class="aloha-ui-inline-icon" src="' + iconUrl + '">';
		},
		makeButtonElement: function(attr){
			// Set type to button to avoid problems with IE which
			// considers buttons to be of type submit by default. One
			// problem that occurd was that hitting enter inside a
			// text-input caused a click event in the button right next
			// to it.
			return $('<button>', attr).attr('type', 'button');
		}
	};
	return Utils;
});
