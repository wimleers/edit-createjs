(function ($) {
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.views = Drupal.edit.views || {};

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
