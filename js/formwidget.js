(function ($, undefined) {
  // # Drupal form-based editing widget for Create.js
  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {
    options: {
      editorOptions: {},
      disabled: true
    },
    // @todo: add a callback to do this in an proper async fashion.
    enable: function () {
      console.log('Drupal.drupalFormWidget.enable');
      this.options.disabled = false;
      this.loadForm();
    },

    loadForm: function () {
      // Create the form asynchronously.
      // @todo: use a different "factory" depending on editable type.
      Drupal.edit.form.create(this.element, function($editable, $field) {
        $editable
          .addClass('edit-belowoverlay')
          .removeClass('edit-highlighted edit-editable');

        Drupal.edit.form.get($editable)
        .find('.edit-form')
        .addClass('edit-editable edit-highlighted edit-editing')
        .css('background-color', $editable.data('edit-background-color'));
      });
    },

    disable: function () {
      console.log('Drupal.drupalFormWidget.disable');
      this.options.disabled = true;
      // @todo: handle this better on the basis of the editable type.
      // Currently we stuff forms into two places ...
      Drupal.edit.form.get(this.element).remove();
      $('#edit_backstage form').remove();

      // Revert the changes to classes applied in the the enable/loadForm
      // methods above.
      this.element
        .removeClass('edit-belowoverlay')
        .addClass('edit-highlighted edit-editable');
    },

    _initialize: function () {
      var self = this;
      $(this.element).bind('focus', function (event) {
        self.options.activated();
      });

      $(this.element).bind('blur', function (event) {
        self.options.deactivated();
      });
    }
  });
})(jQuery);
