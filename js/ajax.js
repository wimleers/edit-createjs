(function($) {

/**
 * @file ajax.js
 *
 * AJAX commands for Edit module.
 */

// Hide these in a ready to ensure that Drupal.ajax is set up first.
$(function() {
  Drupal.ajax.prototype.commands.edit_field_form = function(ajax, response, status) {
    console.log('edit_field_form', ajax, response, status);

    // Only apply the form immediately if this form is currently being edited.
    if (Drupal.edit.state.editedEditable == response.id && ajax.$field.hasClass('edit-type-form')) {
      Drupal.ajax.prototype.commands.insert(ajax, {'data' : response.data});

      // Detect changes in this form.
      Drupal.edit.getForm(ajax.$editable)
      .find(':input').bind('formUpdated.edit', function() {
        ajax.$editable
        .data('edit-content-changed', true)
        .trigger('edit-content-changed.edit');
      });

      // Move  toolbar inside .edit-form-container, to let it snap to the width
      // of the form instead of the field formatter.
      Drupal.edit.getToolbar(ajax.$editable).detach().prependTo('.edit-form')

      var $submit = Drupal.edit.getForm(ajax.$editable).find('.edit-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.edit',
        progress : { type : 'throbber' },
        // IPE-specific settings.
        $editable : ajax.$editable,
        $field : ajax.$field
      };
      var base = $submit.attr('id');
      Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);

      // Give focus to the first input in the form.
      //$('.edit-form').find('form :input:visible:enabled:first').focus()
    }
    else if (Drupal.edit.state.editedEditable == response.id && ajax.$field.hasClass('edit-type-direct')) {
      Drupal.edit.state.directEditableFormResponse = response;
      $('#edit-backstage').append(response.data);

      var $submit = $('#edit-backstage form .edit-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.edit',
        progress : { type : 'throbber' },
        // IPE-specific settings.
        $editable : ajax.$editable,
        $field : ajax.$field
      };
      var base = $submit.attr('id');
      Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);
    }
    else {
      console.log('queueing', response);
    }
  };
  Drupal.ajax.prototype.commands.edit_field_form_saved = function(ajax, response, status) {
    console.log('edit_field_form_saved', ajax, response, status);

    // Stop the editing.
    Drupal.edit.stopEditField(ajax.$editable);

    // Response.data contains the updated rendering of the field, if any.
    if (response.data) {
      // Replace the old content with the new content.
      var $field = $('.edit-field[data-edit-id=' + response.id  + ']');
      var $parent = $field.parent();
      if ($field.css('display') == 'inline') {
        $parent.html(response.data);
      }
      else {
        $field.replaceWith(response.data);
      }

      // Make the freshly rendered field(s) in-place-editable again.
      Drupal.edit.startEditableFields(Drupal.edit.findEditableFields($parent));
    }
  };
});

})(jQuery);
