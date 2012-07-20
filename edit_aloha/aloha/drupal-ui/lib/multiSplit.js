define([
  'jquery',
  'ui/surface',
  'ui/component',
  'ui/button',
  'ui/utils',
  'ui/menuButton'
], function (
  $,
  Surface,
  Component,
  Button,
  Utils,
  MenuButton
) {
  'use strict';

  /**
   * MultiSplit component type. We override this in Drupal's custom AE UI to be
   * a dropdown instead. The text of the dropdown shows the current value, upon
   * opening the dropdown, the user will see a full list of available options.
   * @class
   * @extends {Component}
   */
  var MultiSplit = Component.extend({

    buttons: [],

    /**
     * Initializes the multisplit component
     * @override
     */
    init: function () {
      this.buttons = this.getButtons();

      // @TRICKY: When we want "remove formatting", we'll need to call
      // getItems() instead of getButtons(). Scott Gonzalez decided this
      // shouldn't be a button, hence getButtons() won't return it.

      // The options that the dropdown button will offer.
      var menuItems = [];
      jQuery.each(this.buttons, function(i, button) {
        var text = button.name.toUpperCase();

        menuItems.push({
          text: button.name.toUpperCase(),
          click: button.click
        });
      });

      // The menu button's default text shows the name of the first menu item.
      var FormatMenuButton = MenuButton.extend({
        text: menuItems[0].text,
        menu: menuItems
      });
      var formatMenuButton = new FormatMenuButton();

      // Ensure the button is shown/hidden depending on the current selection.
      this.element = formatMenuButton.element;
      Surface.trackRange(this.element);
    },

    setActiveButton: function(index) {
      if (index == null) {
        return;
      }

      // Set the text of the dropdown button to the newly selected value.
      jQuery('.aloha-ui-menubutton-expand .ui-button-text', this.element)
      .text(this.buttons[index].name.toUpperCase());
    },

    /**
     * Toggles the multisplit menu
     */
    toggle: function () {},

    /**
     * Opens the multisplit menu
     */
    open: function () {},

    /**
     * Closes the multisplit menu
     */
    close: function () {},
  });

  return MultiSplit;
});
