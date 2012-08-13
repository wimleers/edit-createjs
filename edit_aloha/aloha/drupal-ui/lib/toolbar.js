define([
	'jquery',
	'aloha/core',
	'ui/surface',
	'ui/tab',
	'ui/context',
	'i18n!ui/nls/i18n',
	'jqueryui'
], function (
	$,
	Aloha,
	Surface,
	Tab,
	Context,
	i18n
) {
	'use strict';

	/**
	 * The toolbar is configured via `settings.toolbar` and is defined as an
	 * array of tabs with component groups, where the groups are arrays of
	 * controls.
	 *
	 * There are separate components for each context, but only the components
	 * for the active context are shown.
	 *
	 * As a container for tabs, the toolbar serves to group together groups of
	 * control components so that they can be shown and hidden together in
	 * their feature/functional set.  For exmaple groups of table controls
	 * would be placed in a table tab, groups of list controls in an image tab,
	 * and so forth.
	 *
	 * Toolbar class and manager
	 *
	 * @class
	 * @extends {Surface}
	 */
	var Toolbar = Surface.extend({
		$_container: null,
		_tabBySlot: null,
		_tabs: [],

		/**
		 * Toolbar constructor.
		 *
		 * @param {!Array.<(Object|Array|string)>} tabs
		 * @constructor
		 * @override
		 */
		_constructor: function(context, tabs) {
			var tabSettings,
			    tabInstance,
			    i,
			    key;
			this._super(context);
			this.$element = $('<div>', {'class': 'aloha-ui aloha-ui-toolbar', 'unselectable': 'on'});
			this.$_container = Tab.createContainer().appendTo(this.$element);
			this._tabBySlot = {};

			for (i = 0; i < tabs.length; i++) {
				tabSettings = tabs[i];
				tabInstance = new Tab(context, {
					label: i18n.t(tabSettings.label, tabSettings.label),
					showOn: tabSettings.showOn,
					container: this.$_container
				}, tabSettings.components);
				for (key in tabInstance._elemBySlot) {
					if (tabInstance._elemBySlot.hasOwnProperty(key)) {
						this._tabBySlot[key] = tabInstance;
					}
				}
				this._tabs.push({tab: tabInstance, settings: tabSettings});
			}
		},

		adoptInto: function(slot, component){
			var tab = this._tabBySlot[slot];
			return tab && tab.adoptInto(slot, component);
		},

		getActiveContainer: function () {
			return this.$_container.data('aloha-active-container');
		},

		getContainers: function () {
			return this.$_container.data('aloha-tabs');
		},

		/**
		 * Shows the toolbar.
		 */
		show: function () {
			console.log(arguments);
			debugger;
			Toolbar.$surfaceContainer.children().detach();
			Toolbar.$surfaceContainer.append(this.$element);
			Toolbar.$surfaceContainer.stop().fadeTo(200, 1);
			var position = Toolbar.getFloatingPosition();
			this.$element.stop().css({
				top: position.top,
				left: position.left
			});
		},

		/**
		 * Hides the toolbar.
		 */
		hide: function () {
			Toolbar.$surfaceContainer.stop().fadeOut(200, function () {
				Toolbar.$surfaceContainer.children().detach();
			});
		}
	});

	$.extend(Toolbar, {

		/**
		 * An element on which all toolbar surfaces are to be rendered on the
		 * page.
		 * @type {jQuery.<HTMLElement>}
		 */
		$surfaceContainer: null,

		/**
		 * Initializes the toolbar manager.  Adds the surface container
		 * element, and sets up floating behaviour settings.
		 */
		init: function () {
			// TODO should use context.js to get the context element
			Toolbar.$surfaceContainer = $('<div>', {
				'class': 'aloha aloha-surface aloha-toolbar',
				'unselectable': 'on'
			}).hide();

			// In the built aloha.js, init will happend before the body has
			// finished loading, so we have to defer appending the element.
			$(function () { Toolbar.$surfaceContainer.appendTo('body'); });
			Surface.trackRange(Toolbar.$surfaceContainer);
		},
	});

	Toolbar.init();

	return Toolbar;
});
