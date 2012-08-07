/**
 * @file
 * Integrate Aloha Editor with Edit.
 */

(function($) {

Drupal.edit.wysiwyg.edit_aloha = {
  init: function() {
    console.log('edit_aloha:initializing');

    Aloha.settings = Drupal.settings.edit.settings;
    /*
     * TODO: because drupal_add_js(), or really drupal_json_encode() doesn't
     *       support function callbacks, we have to specify it manually here.
     */
    Aloha.settings.plugins = Aloha.settings.plugins || {};
    Aloha.settings.plugins.captionedImage = Aloha.settings.plugins.captionedImage || {};
    Aloha.settings.plugins.captionedImage.render = Drupal.edit.captionedImage.render;

    Aloha.deferInit();
    Aloha.ready(function() {
      $(document).trigger('edit-wysiwyg-ready');
    });
  },

  attach: function($editable) {
    var id = $editable.attr('id');
    // If no ID is set on this editable, then generate one.
    if (typeof id === 'undefined' || id == "") {
      id = 'edit-aloha-' + new Date().getTime();
      $editable.attr('id', id);
    }

    Aloha.jQuery('#' + id).aloha();

    // Notify the Edit module's JS whenever content has changed.
    Aloha.bind('aloha-smart-content-changed.edit_aloha', function(event, alohaEditable) {
      if (alohaEditable.editable.obj[0].id == id) {
        $editable.trigger('edit-wysiwyg-content-changed');
      }
    });
  },

  activate: function($editable) {
    var id = $editable.attr('id');

    Aloha.getEditableById(id).activate();
    // This hack will trigger the floating menu to appear *immediately*.
    Aloha.jQuery('#' + id).trigger('mousedown').trigger('mouseup');
  },

  detach: function($editable) {
    var id = $editable.attr('id');

    Aloha.jQuery('#' + id)
    .unbind('aloha-smart-content-changed.edit_aloha')
    .mahalo();
    if (id.match(/^edit-aloha-\d+$/) != null) {
      $editable.removeAttr('id');
    }
  }
};

})(jQuery);
