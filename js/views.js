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

  // ## FieldView
  //
  // This view wraps a field, and connects it with the state of
  // the Spark Edit module. When state changes to `edit`, the view
  // decorates the view with the necessary DOM and classes to provide
  // the editing tools
  Drupal.edit.views.FieldView = Backbone.View.extend({
    state: null,
    editable: false,
    editing: false,

    events: {
      'mouseenter.edit': 'mouseEnter',
      'mouseleave.edit': 'mouseLeave'
    },
    
    initialize: function (options) {
      this.state = this.options.state;

      _.bindAll(this, 'stateChange', 'mouseEnter', 'mouseLeave', 'checkHighlight');

      this.state.on('change:isViewing', this.stateChange);
      this.state.on('change:fieldBeingHighlighted', this.checkHighlight);
    },

    stateChange: function () {
      if (this.state.get('isViewing')) {
        this.undecorate();
        return;
      }
      this.decorate();
    },

    // Entered edit state
    decorate: function () {
      this.editable = true;

      this.$el
      .addClass('edit-animate-fast')
      .addClass('edit-candidate edit-editable')
      .data('edit-background-color', Drupal.edit.util.getBgColor(this.$el));
    },

    // Left edit state
    undecorate: function () {
      if (!this.editable) {
        return;
      }

      this.$el
      .removeClass('edit-candidate edit-editable edit-highlighted edit-editing edit-belowoverlay');
    },

    mouseEnter: function (event) {
      if (!this.editable) {
        return;
      }
      var self = this;
      Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
        console.log('field:mouseenter');
        if (!self.editing) {
          self.startHighlight();
        }
        event.stopPropagation();
      });
    },

    mouseLeave: function (event) {
      if (!this.editable) {
        return;
      }
      var self = this;
      Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
        console.log('field:mouseenter');
        if (!self.editing) {
          self.stopHighlight();
          // TODO: Do we startHighlight the entity?
        }
        event.stopPropagation();
      });
    },

    startHighlight: function () {
      console.log('startHighlight');
      var self = this;

      if (Drupal.edit.toolbar.create(this.$el)) {

        Drupal.edit.toolbar.get(this.$el)
        .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.info))')
        .append(Drupal.theme('editToolgroup', {
          classes: 'info',
          buttons: [
            {
              url: '#',
              label: Drupal.edit.util.getPredicateLabel(this.$el),
              classes: 'blank-button label',
              hasButtonRole: false
            }
          ]
        }))
        .delegate('a.label', 'click.edit', function (event) {
          self.$el.trigger('click.edit');
          event.stopPropagation();
          event.preventDefault();
        });
      }

      setTimeout(function () {
        self.$el.addClass('edit-highlighted');
        Drupal.edit.toolbar.show(self.$el, 'primary', 'info');
      }, 0);

      this.state.set('fieldBeingHighlighted', this.$el);
      this.state.set('higlightedEditable', this.model.id + ':' + this.predicate);
    },

    stopHighlight: function () {
      console.log('stopHighlight');

      // Animations
      Drupal.edit.toolbar.remove(this.$el);
      this.$el.removeClass('edit-highlighted');

      this.state.set('fieldBeingHighlighted', []);
      this.state.set('higlightedEditable', null);
    },

    checkHighlight: function () {
      if (this.state.get('fieldBeingHighlighted') === this.$el) {
        return;
      }
      this.stopHighlight();
    }
  });

  // ## FormFieldView
  //
  // This view is a subtype of the FieldView that is used for the
  // elements Spark edits via regular Drupal forms.
  Drupal.edit.views.FormFieldView = Drupal.edit.views.FieldView.extend({
  });

})(jQuery);
