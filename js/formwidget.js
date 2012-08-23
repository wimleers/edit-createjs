(function (jQuery, undefined) {
  // # Drupal form-based editing widget for Create.js
  jQuery.widget('Drupal.drupalFormWidget', jQuery.Create.editWidget, {
    options: {
      editorOptions: {},
      disabled: true
    },

    enable: function () {
      this.options.disabled = false;

      var self = this;
      var formLoader = function () {
        self.loadForm();
        self.element.unbind('click', formLoader);
      };

      this.element.bind('click', formLoader);
    },

    loadForm: function () {
      if (Drupal.edit.form.create(this.element)) {
        this.element
        .addClass('edit-belowoverlay')
        .removeClass('edit-highlighted edit-editable');

        Drupal.edit.form.get(this.element)
        .find('.edit-form')
        .addClass('edit-editable edit-highlighted edit-editing')
        .css('background-color', this.element.data('edit-background-color'));
      }

      var field = Drupal.edit.util.findFieldForEditable(this.element);
      Drupal.edit.editables._loadForm(this.element, field);
    },

    disable: function () {
      this.options.disabled = true;

      Drupal.edit.form.get(this.element).remove();
    },

    _initialize: function () {
      var self = this;
      jQuery(this.element).bind('focus', function (event) {
        self.options.activated(); 
      });
      
      jQuery(this.element).bind('blur', function (event) {
        self.options.deactivated(); 
      });
    }
  });
})(jQuery);
