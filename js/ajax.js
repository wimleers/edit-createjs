(function($) {

/**
 * @file ajax.js
 *
 * AJAX commands for Edit module.
 */

// Hide these in a ready to ensure that Drupal.ajax is set up first.
$(function() {
  // these function should never be called as they are overridden by setting the
  // respective Drupal.ajax[{base}].commands.edit_field_form|_saved methods in
  // create/loadForm/saveForm  in ui-editables.
  Drupal.ajax.prototype.commands.edit_field_form = function(ajax, response, status) {};
  Drupal.ajax.prototype.commands.edit_field_form_saved = function(ajax, response, status) {};
  // @todo: refactor this in a similar fashion & figure out where this is
  // needed - probably direct editables.
  Drupal.ajax.prototype.commands.edit_field_rendered_without_transformation_filters = function(ajax, response, status) {
    console.log('edit_field_rendered_without_transformation_filters', ajax, response, status);
    if (Drupal.edit.state.get('editedEditable') == response.id
        && ajax.$field.hasClass('edit-type-direct')
        && ajax.$field.hasClass('edit-text-with-transformation-filters')
        )
    {
      // Indicate in the 'info' toolgroup that the form has loaded.
      Drupal.edit.toolbar.removeClass(ajax.$editable, 'primary', 'info', 'loading');

      // Update the HTML of the editable and enable WYSIWYG editing on it.
      ajax.$editable.html(response.data);
      // @todo: this object doesn't exist anymore.
      Drupal.edit.editables._wysiwygify(ajax.$editable);
    }
  };
});

})(jQuery);
