(function ($) {

Drupal.edit = Drupal.edit || {};
Drupal.edit.wysiwyg = Drupal.edit.wysiwyg || {};

Drupal.edit_backend = Drupal.edit_backend || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit_backend = {
  attach: function(context) {
    // Initialize WYSIWYG, if any.
    if (Drupal.settings.edit.wysiwyg) {
      Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].init();
      $(document).bind('edit-wysiwyg-ready.edit-backend', function() {
        $('.edit-backend-wysiwyg', context).each(function(i, element) {
          Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].attach($(element));
        })
      });
    }
  }
};

})(jQuery);
