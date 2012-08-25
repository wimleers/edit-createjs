(function($) {

/**
 * @file ajax.js
 *
 * AJAX commands for Edit module.
 */

// Hide these in a ready to ensure that Drupal.ajax is set up first.
$(function() {
  Drupal.ajax.prototype.commands.edit_field_form = function(ajax, response, status) {
    console.log('edit_field_form', Drupal.edit.state.get('editedEditable'), ajax, response, status);

    // Only apply the form immediately if this form is currently being edited.
    if (Drupal.edit.state.get('editedEditable') == response.id && ajax.$field.hasClass('edit-type-form')) {
      Drupal.ajax.prototype.commands.insert(ajax, {
        data: response.data,
        selector: '.edit-form-container .placeholder'
      });

      // Indicate in the 'info' toolgroup that the form has loaded.
      Drupal.edit.toolbar.removeClass(ajax.$editable, 'primary', 'info', 'loading');

      // Detect changes in this form.
      Drupal.edit.form.get(ajax.$editable)
      .delegate(':input', 'formUpdated.edit', function() {
        ajax.$editable
        .data('edit-content-changed', true)
        .trigger('edit-content-changed.edit');
      })
      .delegate('input', 'keypress.edit', function(event) {
        if (event.keyCode == 13) {
          return false;
        }
      });

      var $submit = Drupal.edit.form.get(ajax.$editable).find('.edit-form-submit');
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
    else if (Drupal.edit.state.get('editedEditable') == response.id && ajax.$field.hasClass('edit-type-direct')) {
      Drupal.edit.state.set('directEditableFormResponse', response);
      $('#edit_backstage').append(response.data);

      var $submit = $('#edit_backstage form .edit-form-submit');
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

    // Animations.
    Drupal.edit.toolbar.show(ajax.$editable, 'secondary', 'ops');
    ajax.$editable.trigger('edit-form-loaded.edit');
  };
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
      Drupal.edit.editables._wysiwygify(ajax.$editable);
    }
  };
  Drupal.ajax.prototype.commands.edit_field_form_saved = function(ajax, response, status) {
    console.log('edit_field_form_saved', ajax, response, status);

    // Stop the editing.
    Drupal.edit.editables.stopEdit(ajax.$editable);

    // Response.data contains the updated rendering of the field, if any.
    if (response.data) {
      // Replace the old content with the new content.
      var $field = $('.edit-field[data-edit-id="' + response.id  + '"]');
      var $parent = $field.parent();
      if ($field.css('display') == 'inline') {
        $parent.html(response.data);
      }
      else {
        $field.replaceWith(response.data);
      }

      // Make the freshly rendered field(s) in-place-editable again.
      Drupal.edit.startEditableWidgets(Drupal.edit.util.findEditableFields($parent));
    }
  };
});

})(jQuery);
