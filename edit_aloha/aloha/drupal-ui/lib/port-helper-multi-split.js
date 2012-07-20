/**
 * This is a helper module for porting plugins from the old
 * ui-attributefield.js in the aloha core to the new ui-plugin.
 * This interface is obsolete and must not be used for new implementations.
 */
define([
  'aloha/core',
  'jquery',
  'ui/ui',
  'ui/surface',
  'ui/multiSplit',
  'ui/menuButton'
], function (
  Aloha,
  jQuery,
  Ui,
  Surface,
  MultiSplit,
  MenuButton
) {
  'use strict';

  function MultiSplitButton(props) {
    var menuItems = [];
    jQuery.each(props.items, function(i, item) {
      var text = item.name.toUpperCase();

      // Don't show "removeformat".
      if (text == 'REMOVEFORMAT') {
        return;
      }

      menuItems.push({
        text: item.name.toUpperCase(),
        click: function() { return item.click(); }
      });
    })

    var FormatMenuButton = MenuButton.extend({
      text: props.items[0].name.toUpperCase(),
      menu: menuItems
    });

    var formatMenuButton = new FormatMenuButton();
    Ui.adopt(props.name, formatMenuButton);
    Surface.trackRange(formatMenuButton.element);

    return {
      // Expose this function so the cite-plugin can push its own
      // button to the format plugin's multi-split-button (which
      // is a disastrous hack I know).
      // TODO make it possible to combine the items of multiple
      // plugins into a single multi split button.
      pushItem: function(item){
        // props.items.push(item);
      },
      showItem: function(){
        //TODO
      },
      hideItem: function(){
        //TODO
      },
      setActiveItem: function (name) {
        // We don't need to implement this unless we want to make the first item in the dropdown the currently selected/active one.
        jQuery('.aloha-ui-menubutton-expand .ui-button-text', formatMenuButton.element).text(name.toUpperCase());
      }
    };
  }

  return MultiSplitButton;
});
