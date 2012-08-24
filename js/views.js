(function ($) {
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.views = Drupal.edit.views || {};

  // ## EditableView
  //
  // This view wraps a editable DOM element, and connects it
  // with the VIE Entity instance. Whenever the particular
  // attribute (predicate) of the instance changes, whether
  // due to user interaction or some AJAX call, the contents
  // of the DOM element will be automatically updated.
  Drupal.edit.views.EditableView = Backbone.View.extend({
    predicate: null,

    initialize: function (options) {
      this.predicate = '<http://viejs.org/ns/' + options.predicate + '>';
      _.bindAll(this, 'render');
      this.model.bind('change:' + this.predicate, this.render);
    },

    render: function () {
      jQuery(this.el).html(this.model.get(this.predicate)); 
    }
  });

})(jQuery);
