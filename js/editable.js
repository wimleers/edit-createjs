(function (jQuery, undefined) {
  // # Create.js editing widget for Spark
  //
  // This widget inherits from the Create.js editable widget to accommodate
  // for the fact that Spark is using custom data attributes and not RDFa
  // to communicate editable fields.
  jQuery.widget('Drupal.createEditable', jQuery.Midgard.midgardEditable, {
    _create: function () {
      this.vie = this.options.vie;

      this.options.editors.direct = {
        widget: 'editWidget',
        options: {}
      };
      this.options.editors.directWysiwyg = {
        widget: 'alohaWidget',
        options: {}
      };
      this.options.editors.form = {
        widget: 'drupalFormWidget',
        options: {}
      };
    },

    findEditableElements: function (callback) {
      var model = this.options.model;
      var fields = Drupal.edit.util.findEditableFields(this.element).andSelf().filter(function () {
        return Drupal.edit.util.getElementSubject(jQuery(this)) == model.getSubjectUri();
      });
      Drupal.edit.util.findEditablesForFields(fields).each(callback);
    },

    getElementPredicate: function (element) {
       return Drupal.edit.util.getElementPredicate(jQuery(element));
    },

    _editorName: function (data) {
      if (Drupal.settings.edit.wysiwyg && jQuery(this.element).hasClass('edit-type-direct')) {
        if (jQuery(this.element).hasClass('edit-type-direct-with-wysiwyg')) {
          return 'directWysiwyg';
        }
        return 'direct';
      }
      return 'form';
    }
  });
})(jQuery);
