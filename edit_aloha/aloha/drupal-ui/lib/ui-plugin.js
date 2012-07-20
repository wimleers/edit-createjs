// @TRICKY: 'ui/ui-plugin' instead of 'drupal-ui/ui-plugin' because Aloha
// assumes 'ui/ui-plugin'. Through requireConfig.paths we override this in
// Aloha's settings.
define('ui/ui-plugin', [
  'jquery',
  'aloha',
  'ui/context',
  'ui/container',
  'ui/surface',
  'ui/scopes',
  'ui/settings',
  // Most modules of the ui plugin depend on jquery-ui, but its easy
  // to forget to add the dependency so we do it here.
  'jqueryui'
], function(
  $,
  Aloha,
  Context,
  Container,
  Surface,
  Scopes,
  Settings
) {
  'use strict';

  var componentsHash = {};

  Aloha.bind('aloha-editable-activated', function(event, alohaEvent) {
    _addComponentsToToolbar();
  });

  function adoptInto(slot, component) {
    // Remember slots & components because we're going to need to recreate
    // the components whenever a Field gets focus and needs AE.
    componentsHash[slot] = component;
    Surface.trackRange(component.element);
  }

  function _addComponentsToToolbar() {
    // @TODO: make sure the order come from the Drupal site, instead of having
    // them hardcoded here
    var order = [
      'strong',
      'emphasis',
      'bold',
      'italic',
      'underline',
      'superscript',
      'subscript',
      'strikethrough',
      'strikethrough2',
      'alignLeft',
      'alignCenter',
      'alignRight',
      'alignJustify',
      'formatBlock',
      'unorderedList',
      'orderedList',
      'indentList',
      'outdentList',
    ];

    // @TODO: figure out the $editable more cleanly?
    var $editable = Drupal.edit.state.fieldBeingHighlighted;
    var $toolgroup = Drupal.edit.toolbar.get($editable)
                     .find('.edit-toolbar.primary .edit-toolgroup.wysiwyg');

    // Order the components in our preferred way.
    var sortable = [];
    for (var component in componentsHash) {
      if (componentsHash.hasOwnProperty(component)) {
        sortable.push([component, componentsHash[component].element]);
      }
    }
    sortable.sort(function(a, b) {
      return (order.indexOf(a[0]) < order.indexOf(b[0])) ? -1 : 1;
    })

    // Append the ordered components into the toolbar.
    for (var i = 0; i < sortable.length; i++) {
      $toolgroup.append(sortable[i][1]);
    }
  };

  return {
    adoptInto: adoptInto
  };
});
