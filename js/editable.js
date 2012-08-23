(function (jQuery, undefined) {
  // # Create.js editing widget for Spark
  //
  // This widget inherits from the Create.js editable widget to accommodate
  // for the fact that Spark is using custom data attributes and not RDFa
  // to communicate editable fields.
  jQuery.widget('Drupal.createEditable', jQuery.Midgard.midgardEditable, {
    findEditableElements: function (callback) {
      var fields = Drupal.edit.findEditableFields(this.element);
      var model = this.options.model;
      fields.filter(function () {
        return Drupal.edit.util.getElementSubject(jQuery(this)) == model.getSubjectUri();
      }).each(callback);
    },

    getElementPredicate: function (element) {
       return Drupal.edit.util.getElementPredicate(jQuery(element));
    },

    _editorWidget: function () {
      return 'alohaWidget';
    }
  });
})(jQuery);
