/**
 * @file
 * Integrate Aloha Editor with Edit.
 */

(function($, window, undefined) {
var Aloha = window.Aloha || (window.Aloha = {});

// @TODO: this is a currently futile attempt to get AE to use Drupal's jQuery.
// It is futile, because AE's JS is loaded before this one and thus it will
// already be too late.
// Aloha.settings = {
//    jQuery: $,
// };

Drupal.edit.wysiwyg.edit_aloha = {
  init: function() {
    console.log('edit_aloha:initializing');
    this._fixExtJsArrayPrototypeOverride();

    Aloha.ready(function() {
      $(document).trigger('edit-wysiwyg-ready');
    });
  },

  attach: function($editable) {
    var id = $editable.attr('id');
    // If no ID is set on this editable, then generate one.
    if (id == "") {
      id = 'edit-aloha-' + new Date().getTime();
      $editable.attr('id', id);
    }

    Aloha.jQuery('#' + id).aloha();
    // Activate Aloha for this editable.
    Aloha.getEditableById(id).activate();
    // This hack will trigger the floating menu to appear *immediately*.
    Aloha.jQuery('#' + id).trigger('mousedown').trigger('mouseup');
  },

  detach: function($editable) {
    var id = $editable.attr('id');

    Aloha.jQuery('#' + id).mahalo();
    if (id.match(/^edit-aloha-\d+$/) != null) {
      $editable.removeAttr('id');
    }
  },

  // Workaround for http://drupal.org/node/1404584
  _fixExtJsArrayPrototypeOverride: function () {
    if (Array.prototype.remove) {
      delete Array.prototype.remove;
      Ext.applyIf(Array.prototype, {
        remove: function (o) {
          if (!this.indexOf) return this;
          var index = this.indexOf(o);
          if (index != -1) {
            this.splice(index, 1);
          }
          return this;
        }
      });
    }
  },
};

})(jQuery, window);
