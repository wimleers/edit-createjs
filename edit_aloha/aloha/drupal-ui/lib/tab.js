define([
	'aloha/core',
	'jquery',
	'ui/container',
	'ui/component',
	'PubSub',
	'jqueryui'
], function (
	Aloha,
	$,
	Container,
	Component,
	PubSub
) {
	'use strict';

	var idCounter = 0;
	var slottedComponents = {};


	/**
	 * A "tab" consists of two things: a handle and a panel. The handle is the
	 * "tab" itself, the panel is the content associated with that tab.
	 */

	/**
	 * Defines a Container object that represents a collection of related
	 * component groups to be rendered together on the toolbar.  Tabs are
	 * organized by feature and functionality so that related controls can be
	 * brought in and out of view depending on whether they are
	 * appropriate for a given user context.
	 *
	 * Tabs can be defined declaritively in the Aloha configuration in the
	 * following manner:
	 *
	 *    Aloha.settings.toolbar: [
	 *      {
	 *         label: 'Lists',
	 *         showOn: 'ul,ol,*.parent(.aloha-editable ul,.aloha-editable ol)',
	 *         components: [ [ 'orderedList', 'unorderedList' ] ]
	 *      }
	 *    ]
	 *
	 * Alternatively, tabs can also be created imperatively in this way:
	 * new Tab( options, components ).
	 *
	 * @class
	 * @extends {Container}
	 */
	var Tab = Container.extend({

		_elemBySlot: null,
		_groupBySlot: null,
		_groupByComponent: null,
		// State tracking for our alternative to jQuery UI Tabs.
		_tabActiveHandleIndex: null,
		_tabActiveHandle: null,

		/**
		 * All that this constructor does is save the components array into a
		 * local variable, to be used during instantialization.
		 *
		 * @param {object} settings
		 * @param {Array.<Array<string>>} components
		 * @constructor
		 */
		_constructor: function (context, settings, components) {
			var thisTab = this,
			    i, j,
			    elem,
			    groupedComponents,
			    group,
			    groupProps,
			    componentName;

			this._elemBySlot = {};
			this._groupBySlot = {};
			this._groupByComponent = {};
			this._super(context, settings);

			this.handles = settings.handlesContainer;
			this.panels = settings.panelsContainer;
			this.id = 'aloha-drupal-ui-tab-panel-' + (++idCounter);
			this.panel = $('<div>', {id : this.id, 'unselectable': 'on'});
			// this.handle = Drupal.theme('editToolgroup', {
			//         classes: 'entity',
			//         buttons: [
			//           { url: '#' + this.id, label: settings.label, classes: 'blank-button label' },
			//         ]
			//       });
			this.handle = $('<li><a href="#' + this.id + '">' +
				settings.label + '</a></li>');

			for (i = 0; i < components.length; i++) {
				if (typeof components[i] === 'string') {
					if (1 === components[i].length && components[i].charCodeAt(0) === 10) {
						this.panel.append('<div>', {'unselectable': 'on'});
					} else {
						elem = $('<span>', {'unselectable': 'on'});
						this._elemBySlot[components[i]] = elem;
						this.panel.append(elem);
					}
				} else {
					group = $('<div>', {
						'class': 'aloha-ui-component-group',
						'unselectable': 'on'
					}).appendTo(this.panel);
					groupProps = {element: group, visibleCounter: 0};
					groupedComponents = components[i];
					for (j = 0; j < groupedComponents.length; j++) {
						this._groupBySlot[groupedComponents[j]] = groupProps;
						if (groupedComponents[j] &&
							1 === groupedComponents[j].length &&
						    groupedComponents[j].charCodeAt(0) === 10) {
							group.append($('<div>', {'unselectable': 'on'}));
						} else {
							componentName = groupedComponents[j];
							elem = $('<span>', {'unselectable': 'on'});
							this._elemBySlot[groupedComponents[j]] = elem;
							group.append(elem);
						}
					}
				}
			}

			this.panel.append($('<div>', {'class': 'aloha-ui-clear', 'unselectable': 'on'}));
			this.handle.appendTo(this.handles);
			this.panel.appendTo(this.panels);


			this._init();
			// this.container.tabs('refresh');

			var alohaTabs = this.handles.data('aloha-tabs');
			this.index = alohaTabs.length;
			alohaTabs.push(this);
		},

		// idempotent (called whenever a tab is created)
		_init: function() {
			// Determine active tab, bail if no tabs.
			this._tabActiveHandleIndex = ( this._tabActiveHandleIndex === null && this.index > 0 ) ? 0 : false;
			if ( this._tabActiveHandleIndex === false) {
				return;
			}

			this._refresh();
		},

		_refresh: function() {
			// _processTabs()
			// Find all tab handles and set the "aria-controls" attribute.
			var anchors = this.handles.children().map(function() {
				return $( "a", this )[ 0 ];
			});
			anchors.each(function( i, a ) {
				var selector = a.hash;
				$( a ).attr( "aria-controls", selector.substring( 1 ) );
			});

			// _refresh()
			this.handles
				// tab handles container
				.addClass( "aloha-drupal-ui-tab-handle-container" )
				// tab handles
				.children()
				.addClass( "aloha-drupal-ui-tab-handle" )
				.addClass( "aloha-drupal-ui-state-default" );
			this.panels
				// tab panels container
				.addClass( "aloha-drupal-ui-tab-panel-container" )
				// tab panels
				.children()
				.addClass( " aloha-drupal-ui-tab-panel " )
				// tab panels that are not active (default state: hidden)
				.not( this._getPanelForHandle( this._tabActiveHandle ) )
				.hide();
				// .not( ".aloha-drupal-ui-state-active" )
				// .addClass( "aloha-drupal-ui-state-default aloha-drupal-ui-state-hidden" );

			// _setupEvents()
			anchors
				// Unbind to avoid duplicates.
				.unbind( ".aloha-drupal-ui-tabs" )
				//
				.bind( "click.aloha-drupal-ui-tabs", function() {
					$.proxy( this, "_eventHandler" );
				});
		},

		_getVisibleHandleByIndex: function( index ) {
			var that = this;
			return that.handles.children( ":visible" )[ index ];
		},

		_getIndexOfHandle: function( handle ) {
			var that = this;
			return that.handles.children().index( handle );
		},

		_getPanelForHandle: function( handle ) {
			var that = this;
			var id = $( handle ).attr( "aria-controls" );
			return that.panels.find( "#" + id );
		},

		_eventHandler: function( event ) {
			var that = this,
				activeHandle = that._tabActiveHandle,
				activeHandleIndex = that._tabActiveHandleIndex,
				clicked = $( event.currentTarget ),
				clickedHandle = clicked.closest( "li" ),
				clickedIsActive = clickedHandle[ 0 ] === activeHandle[ 0 ],
				// clickedIsActive = clicked[ 0 ] === that._getVisibleHandleByIndex( activeIndex ),
				toShow = that._getPanelForHandle( clickedHandle ),
				toHide = !activeHandle.length ? $() : that._getPanelForHandle( activeHandle ),
				eventData = {
					oldHandle: activeHandle,
					oldPanel: toHide,
					newHandle: clickedHandle,
					newPanel: toShow
				};

			event.preventDefault();

			// If the clicked handle is already marked as active and actually *is* active, bail.
			if ( clickedIsActive && activeHandle === that._getVisibleHandleByIndex( activeIndex ) ) {
				return;
			}

			// If the clicked handle is disabled or hidden, bail.
			if ( handle.hasClass( "aloha-drupal-ui-state-disabled" )
					|| handle.hasClass( "aloha-drupal-ui-state-hidden" ) )
			{
				clicked[ 0 ].blur();
				return;
			}

			that._tabActiveHandleIndex = that._getIndexOfHandle( clicked );
			that._tabActiveHandle = clickedHandle;
			that.active = clickedIsActive ? $() : clicked;

			if ( !toHide.length && !toShow.length ) {
				throw "Aloha UI Tabs: Mismatching fragment identifier.";
			}

			that._updateUI( event, eventData );
		},

		_updateUI: function( event, eventData ) {
			// Without queuing or delays: switch the active tab and start showing the
			// new panel.
			function show() {
				eventData.oldHandle.removeClass( "aloha-drupal-ui-state-active" );
				eventData.newHandle.addClass( "aloha-drupal-ui-state-active" );
				eventData.newPanel.show();
			}

			// Hide the old panel. Upon completing that, call show().
			if (eventData.oldPanel) {
				eventData.oldPanel.hide(function() {
					show();
				});
			}
			// There was nothing to hide, so just start showing.
			else {
				show();
			}
		},

		select: function( index ) {
			var that = this;
			that.handles.children().eq( index ).trigger( "click.aloha-drupal-ui-tabs" );

			that._tabSelected( that );
		},

		adoptInto: function(slot, component) {
			var elem = this._elemBySlot[slot],
			    group;
			if (!elem) {
				return false;
			}
			slottedComponents[slot] = component;
			component.adoptParent(this);
			elem.append(component.element);
			group = this._groupBySlot[slot];
			if (group) {
				this._groupByComponent[component.id] = group;
				if (component.isVisible()) {
					group.visibleCounter += 1;
				}
			}
			return true;
		},

		foreground: function() {
			this.select( this.index );
		},

		childForeground: function(childComponent) {
			this.foreground();
		},

		hasVisibleComponents: function () {
			var siblings = this._elemBySlot;
			var slot;
			for (slot in siblings) {
				if (siblings.hasOwnProperty(slot) && slottedComponents[slot]) {
					if (slottedComponents[slot].visible) {
						return true;
					}
				}
			}
			return false;
		},

		childVisible: function(childComponent, visible) {
			if (visible) {
				childComponent.container.show();
			} else if (!childComponent.container.hasVisibleComponents()) {
				childComponent.container.hide();
			}
			var group = this._groupByComponent[childComponent.id];
			if (!group) {
				return;
			}
			if (visible) {
				if (0 === group.visibleCounter) {
					group.element.removeClass('aloha-ui-hidden');
				}
				group.visibleCounter += 1;
			} else {
				group.visibleCounter -= 1;
				if (0 === group.visibleCounter) {
					group.element.addClass('aloha-ui-hidden');
				}
			}
		},

		_tabSelected: function( tab ) {
			var that = this;

			var tabs = that.handles.data( 'aloha-tabs' );
			// $container.data( 'aloha-active-container', tabs[tab.index] );
			console.log('_tabSelected', tab, tabs, tabs[tab.index]);
			PubSub.pub( 'aloha.ui.container.selected', {data: tabs[tab.index]} );
		},

		/**
		 * @override
		 */
		show: function() {
			if (!this.handles.children().length) {
				return;
			}
			this.handle.show();
			this.visible = true;

			// Hiding all tabs may hide the toolbar, so showing the
			// first tab again must also show the toolbar.
			// this.container.show();

			// // If no tabs are selected, then select the tab which was just shown.
			// if (   !this.container.find('.ui-tabs-active').length
			//     ||  this.container.tabs('option', 'selected') === this.index) {
			// 	this.foreground();
			// }

			this.foreground();
		},

		/**
		 * @override
		 */
		hide: function() {
			if ( 0 === this.handles.children().length ) {
				return;
			}
			this.handle.hide();
			this.visible = false;

			// If the tab we just hid was the selected tab, then we need to
			// select another tab in its stead.  We will select the first
			// visible tab we find, or else we deselect all tabs.
			if ( this.index === this._tabActiveHandleIndex ) {
				var tabs = this.container.data( 'aloha-tabs' );

				var i;
				for ( i = 0; i < tabs.length; ++i ) {
					if ( tabs[ i ].visible ) {
						this.select(i);
						// this.container.tabs( 'select', i );
						return;
					}
				}

				// Why do we remove this class?
				// this.handle.removeClass( 'ui-tabs-active' );

				// It doesn't make any sense to leave the toolbar
				// visible after all tabs have been hidden.
				// this.container.hide();
			}
		}

	});

	$.extend(Tab, {

		/**
		 * Creates holding elements.
		 *
		 * @static
		 * @return {jQuery.<HTMLElement>} The holder container.
		 */
		createContainers: function () {
			// var $container = $('<div>', {'unselectable': 'on'});
			// var $handles = $('<ul>', {'unselectable': 'on'}).appendTo($container);
			// var $panels = $('<div>', {'unselectable': 'on'}).appendTo($container);
			//
			// $container
			// 	// tab handles (the visible "tabs")
			// 	.data('handles', $handles)
			// 	// tab panels (the content of each tab)
			// 	.data('panels', $panels)
			// 	// all tab metadata
			// 	.data('aloha-tabs', []);
			// return $container;
			var $handles = $('<ul>', { 'class': 'tab-handles', 'unselectable': 'on'})
				.data( 'aloha-tabs', [] );
			var $panels = $('<div>', { 'class': 'tab-panels', 'unselectable': 'on'});
			return { handlesContainer: $handles, panelsContainer: $panels };
		}
	});

	return Tab;
});
