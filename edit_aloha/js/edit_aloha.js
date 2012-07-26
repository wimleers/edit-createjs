/**
 * @file
 * Integrate Aloha Editor with Edit.
 */

(function($) {

Drupal.edit.wysiwyg.edit_aloha = {
  init: function() {
    console.log('edit_aloha:initializing');

    Aloha.settings = Drupal.settings.edit.settings;
    Aloha.deferInit();
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

    this._markImages($editable);

    Aloha.jQuery('#' + id).aloha();
  },

  activate: function($editable) {
    var id = $editable.attr('id');

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

    this._unmarkImages($editable);
  },

  // The AE Captioned Image plug-in only works on images that have a certain
  // class, mark images that should be captionable with this class.
  _markImages: function($editable) {
    // @TODO: For now, make *all* images captionable.
    $editable
    .find('img')
    .addClass('aloha-captioned-image');
  },

  _unmarkImages: function($editable) {
    $editable
    .find('.aloha-captioned-image')
    .removeClass('aloha-captioned-image');
  }
};

})(jQuery);
