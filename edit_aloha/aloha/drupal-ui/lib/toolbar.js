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
			this.tabContainers = Tab.createContainers();
			Toolbar.$tabsSurfaceContainer.append( this.tabContainers.handlesContainer );
			Toolbar.$mainSurfaceContainer.append( this.tabContainers.panelsContainer );
			this._tabBySlot = {};

			for (i = 0; i < tabs.length; i++) {
				tabSettings = tabs[i];
				tabInstance = new Tab(context, {
					label: i18n.t(tabSettings.label, tabSettings.label),
					showOn: tabSettings.showOn,
					handlesContainer: this.tabContainers.handlesContainer,
					panelsContainer: this.tabContainers.panelsContainer,
					state: this.tabContainers.handlesContainer.data( 'state' )
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

		/**
		 * Shows the toolbar.
		 */
		show: function () {
			// Move the toolbar surface into our custom location.
			jQuery( '.edit-toolgroup.wysiwyg-tabs:first' )
				.append( Toolbar.$tabsSurfaceContainer.detach() );
			jQuery( '.edit-toolgroup.wysiwyg:first' )
				.append( Toolbar.$mainSurfaceContainer.detach() );

			// Now show the appropriate content.
			Toolbar.$tabsSurfaceContainer.stop().fadeTo( 200, 1 );
			Toolbar.$mainSurfaceContainer.stop().fadeTo( 200, 1, function() {
				// Let Edit's JS know that its tertiary toolbar has changed, so that it
				// can decide to e.g. increase its height to accomodate the changed
				// content.
				jQuery( '.edit-toolgroup.wysiwyg:first' )
					.trigger( 'edit-toolbar-tertiary-changed' );
			});
		},

		/**
		 * Hides the toolbar.
		 */
		hide: function () {
			Toolbar.$mainSurfaceContainer
				.add( Toolbar.$tabsSurfaceContainer )
				.stop().fadeOut( 200, function () {
					// Move the toolbar surface into its original location again.
					Toolbar.$mainSurfaceContainer
						.detach()
						.appendTo( 'body' );
					Toolbar.$tabsSurfaceContainer
						.detach()
						.appendTo( 'body' );
				});

		}
	});

	$.extend(Toolbar, {

		/**
		 * An element on which all toolbar surfaces are to be rendered on the
		 * page.
		 * @type {jQuery.<HTMLElement>}
		 */
		$mainSurfaceContainer: null,

		$tabsSurfaceContainer: null,

		/**
		 * Initializes the toolbar manager.  Adds the surface container
		 * element, and sets up floating behaviour settings.
		 */
		init: function () {
			// TODO should use context.js to get the context element
			Toolbar.$mainSurfaceContainer = $('<div>', {
				'class': 'drupal-aloha aloha-surface aloha-toolbar',
				'unselectable': 'on'
			}).hide();

			Toolbar.$tabsSurfaceContainer = $('<div>', {
				'class': 'drupal-aloha aloha-surface aloha-toolbar-tabs',
				'unselectable': 'on'
			}).hide();


			// In the built aloha.js, init will happend before the body has
			// finished loading, so we have to defer appending the element.
			$(function () {
				Toolbar.$mainSurfaceContainer.appendTo('body');
				Toolbar.$tabsSurfaceContainer.appendTo('body');
			});
			Surface.trackRange(Toolbar.$mainSurfaceContainer);
			Surface.trackRange(Toolbar.$tabsSurfaceContainer);
		},
	});

	Toolbar.init();

	return Toolbar;
});
