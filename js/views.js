(function ($) {
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.views = Drupal.edit.views || {};

  Drupal.edit.views.OverlayView = Backbone.View.extend({
    state: null,

    initialize: function (options) {
      this.state = options.state;
      _.bindAll(this, 'stateChange');
      this.state.bind('change:isViewing', this.stateChange);
    },

    stateChange: function () {
      if (this.state.get('isViewing')) {
        this.hideOverlay();
        return;
      }
      this.showOverlay();
    },

    showOverlay: function () {
      $(Drupal.theme('editOverlay', {}))
      .appendTo('body')
      .addClass('edit-animate-slow edit-animate-invisible')

      // Animations
      $('#edit_overlay').css('top', $('#navbar').outerHeight());
      $('#edit_overlay').removeClass('edit-animate-invisible');

      // Disable contextual links in edit mode.
      $('.contextual-links-region')
      .addClass('edit-contextual-links-region')
      .removeClass('contextual-links-region');
    },

    hideOverlay: function () {
      $('#edit_overlay')
      .addClass('edit-animate-invisible')
      .bind(Drupal.edit.const.transitionEnd, function (event) {
        $('#edit_overlay, .edit-form-container, .edit-toolbar-container, #edit_modal, #edit_backstage, .edit-curtain').remove();
      });

      // Enable contextual links in edit mode.
      $('.edit-contextual-links-region')
      .addClass('contextual-links-region')
      .removeClass('edit-contextual-links-region');
    }
  })

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
      this.$el.html(this.model.get(this.predicate)); 
      return this;
    }
  });

  // ## FieldView
  //
  // This view wraps a field, and connects it with the state of
  // the Spark Edit module. When state changes to `edit`, the view
  // decorates the view with the necessary DOM and classes to provide
  // the editing tools
  Drupal.edit.views.FieldView = Backbone.View.extend({
    predicate: null,
    state: null,
    editable: false,
    editing: false,
    vie: null,

    events: {
      'mouseenter': 'mouseEnter',
      'mouseleave': 'mouseLeave'
    },
    
    initialize: function (options) {
      this.state = this.options.state;
      this.predicate = this.options.predicate;
      this.vie = this.options.vie;

      _.bindAll(this, 'stateChange', 'mouseEnter', 'mouseLeave', 'checkHighlight');

      this.state.on('change:isViewing', this.stateChange);
      this.state.on('change:fieldBeingHighlighted', this.checkHighlight);
    },

    stateChange: function () {
      if (this.state.get('isViewing')) {
        this.editable = false;
        this.undecorate();
        return;
      }
      this.editable = true;
      this.decorate();
    },

    decorate: function () {
      this.$el
      .addClass('edit-animate-fast')
      .addClass('edit-candidate edit-editable')
      .data('edit-background-color', Drupal.edit.util.getBgColor(this.$el));
    },

    undecorate: function () {
      this.$el
      .removeClass('edit-candidate edit-editable edit-highlighted edit-editing edit-belowoverlay');
    },

    mouseEnter: function (event) {
      if (!this.editable) {
        return;
      }
      var self = this;
      Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
        if (!self.editing) {
          console.log('field:mouseenter', self.model.id, self.predicate);
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
        if (!self.editing) {
          console.log('field:mouseleave', self.model.id, self.predicate);
          self.stopHighlight();
          // TODO: Do we startHighlight the entity?
        }
        event.stopPropagation();
      });
    },

    startHighlight: function () {
      console.log('startHighlight', this.model.id, this.predicate);
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
      console.log('stopHighlight', this.model.id, this.predicate);

      // Animations
      Drupal.edit.toolbar.remove(this.$el);
      this.$el.removeClass('edit-highlighted');

      this.state.set('fieldBeingHighlighted', []);
      this.state.set('higlightedEditable', null);
    },

    checkHighlight: function () {
      return;
      if (this.state.get('fieldBeingHighlighted') === this.$el) {
        return;
      }
      this.stopHighlight();
    }
  });

  // ## EditableFieldView
  //
  // This element is a subtype of the FieldView that adds the controlling
  // needed for direct editables (as provided by Create.js editable widget)
  // to the FieldView
  Drupal.edit.views.EditableFieldView = Drupal.edit.views.FieldView.extend({

    events: {
      'mouseenter': 'mouseEnter',
      'mouseleave': 'mouseLeave',
      'click':      'enableEditor',
      'createeditableenable': 'editorEnabled',
      'createeditabledisable': 'editorDisabled',
      'createeditablechanged': 'contentChanged'
    },

    initialize: function (options) {
      this.state = this.options.state;
      this.predicate = this.options.predicate;
      this.vie = this.options.vie;

      _.bindAll(this, 'stateChange', 'mouseEnter', 'mouseLeave', 'checkHighlight', 'enableEditor', 'editorEnabled', 'editorDisabled', 'contentChanged');

      this.state.on('change:isViewing', this.stateChange);
      this.state.on('change:fieldBeingHighlighted', this.checkHighlight);
    },

    stateChange: function () {
      if (this.state.get('isViewing')) {
        this.stopEditable();
        return;
      }
      this.startEditable();
    },

    // Entered edit state
    startEditable: function () {
      this.editable = true;

      this.$el.createEditable({
        model: this.model,
        vie: this.vie,
        disabled: true
      });

      this.decorate();
    },

    // Left edit state
    stopEditable: function () {
      if (!this.editable) {
        return;
      }
      this.editable = false;

      this.undecorate();
    },

    enableEditor: function (event) {
      if (!this.editable) {
        // Not in edit state, ignore
        return;
      }

      if (this.editing) {
        // Already editing, ignore
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      // TODO: startEdit
      this.startHighlight();

      this.$el
      .addClass('edit-editing')
      .css('background-color', this.$el.data('edit-background-color'));

      // TODO: Ensure others are not editable why we are
      // Should be done by state
      
      // Hide the curtain while editing
      //Drupal.edit.util.findEntityForField(this.$el).find('.comment-wrapper .edit-curtain').height(0);

      // Enable the toolbar with the save and close buttons
      this.enableToolbar();

      // Start the Create.js editable widget
      this.enableEditableWidget();

      this.state.set('fieldBeingEdited', this.$el);
      this.state.set('editedEditable', this);
    },

    enableEditableWidget: function () {
      this.$el.createEditable({disabled: false});
    },

    enableToolbar: function () {
      var self = this;
      Drupal.edit.toolbar.get(this.$el)
      .addClass('edit-editing')
      .find('.edit-toolbar.secondary:not(:has(.edit-toolgroup.ops))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'ops',
        buttons: [
          {
            url: '#',
            label: Drupal.t('Save'),
            classes: 'field-save save gray-button'
          },
          {
            url: '#',
            label: '<span class="close"></span>',
            classes: 'field-close close gray-button'
          }
        ]
      }))
      .delegate('a.field-save', 'click.edit', function (event) {
        self.saveClicked(event);
      })
      .delegate('a.field-close', 'click.edit', function (event) {
        self.closeClicked(event);
      });
    },

    disableEditor: function () {
      console.log('stopEdit', this.model.id, this.predicate);

      this.$el
      .removeClass('edit-highlighted edit-editing edit-belowoverlay')
      .css('background-color', '');

      // TODO: Restore curtain height
      
      // Stop the Create.js editable widget
      this.disableEditableWidget();

      Drupal.edit.toolbar.remove(this.$el);

      this.state.set('fieldBeingEdited', []);
      this.state.set('editedEditable', null);
    },

    disableEditableWidget: function () {
      this.$el.createEditable({disabled: true});
    },

    editorEnabled: function () {
      console.log("editorenabled", this.model.id, this.predicate);
      this.padEditable();

      if (this.$el.hasClass('edit-type-direct-with-wysiwyg')) {
        Drupal.edit.toolbar.get(this.$el)
        .find('.edit-toolbar.secondary:not(:has(.edit-toolbar-wysiwyg-tabs))')
        .append(Drupal.theme('editToolgroup', {
          classes: 'wysiwyg-tabs',
          buttons: []
        }))
        .end()
        .find('.edit-toolbar.tertiary:not(:has(.edit-toolgroup.wysiwyg))')
        .append(Drupal.theme('editToolgroup', {
          classes: 'wysiwyg',
          buttons: []
        }));
      }

      // TODO: Load processed text
      this.$el.addClass('edit-wysiwyg-attached');
      Drupal.edit.toolbar.show(this.$el, 'secondary', 'wysiwyg-tabs');
      Drupal.edit.toolbar.show(this.$el, 'tertiary', 'wysiwyg');
      
      this.$el.data('edit-content-changed', false);

      this.editing = true;
    },

    padEditable: function () {
      // Add a 5px padding for readability
      if (this.$el[0].style.width === '') {
        this.$el
        .data('edit-width-empty', true)
        .addClass('edit-animate-disable-width')
        .css('width', this.$el.width());
      }
    },

    unpadEditable: function () {
    },

    editorDisabled: function () {
      console.log("editordisabled", this.model.id, this.predicate);
      this.unpadEditable();
      this.$el.removeClass('ui-state-disabled');
      this.$el.removeClass('edit-wysiwyg-attached');

      this.editing = false;
    },

    contentChanged: function () {
      this.$el.data('edit-content-changed', true);
      this.$el.trigger('edit-content-changed.edit');
    }
  });

  // ## FormEditableFieldView
  //
  // This view is a subtype of the FieldView that is used for the
  // elements Spark edits via regular Drupal forms.
  Drupal.edit.views.FormEditableFieldView = Drupal.edit.views.EditableFieldView.extend({

    enableEditableWidget: function () {
      this.$el.createEditable({disabled: false});
      Drupal.edit.editables._loadForm(Drupal.edit.util.findEditablesForFields(this.$el), this.$el);
    },

    disableEditableWidget: function () {
      this.$el.createEditable({disabled: true});
      $('#edit_backstage form').remove();
    }


  });

})(jQuery);
