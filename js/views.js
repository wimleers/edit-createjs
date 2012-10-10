(function ($) {
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.views = Drupal.edit.views || {};

  Drupal.edit.views.OverlayView = Backbone.View.extend({
    state: null,

    events: {
      'click': 'escapeEditor'
    },

    initialize: function (options) {
      this.state = options.state;
      _.bindAll(this, 'stateChange', 'escapeEditor');
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
        $('#edit_overlay, .edit-form-container, .edit-toolbar-container, #edit_modal, .edit-curtain').remove();
      });

      // Enable contextual links in edit mode.
      $('.edit-contextual-links-region')
      .addClass('contextual-links-region')
      .removeClass('edit-contextual-links-region');
    },

    escapeEditor: function () {
      var editor = this.state.get('fieldBeingEdited');
      if (Drupal.edit.modal.get().length > 0 || editor.length === 0) {
        return;
      }
      // No modals open and user is in edit state, close editor by
      // triggering a click to the cancel button
      Drupal.edit.toolbar.get(editor)
      .find('a.close')
      .trigger('click.edit');
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
    editableViews: [],

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

    buildEditableView: function () {
      var self = this;
      Drupal.edit.util.findEditablesForFields(this.$el).each(function () {
        self.editableViews.push(new Drupal.edit.views.EditableView({
          model: self.model,
          el: this,
          predicate: self.predicate
        }));
      });
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
      // @todo: clarify: undecorating shouldn't remove edit-editable?
      this.$el
        .removeClass('edit-candidate edit-editable edit-highlighted edit-editing edit-belowoverlay');
    },

    mouseEnter: function (event) {
      if (!this.editable) {
        return;
      }
      if (this.state.get('editedFieldView')) {
        // Some field is being edited, ignore
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
      if (this.state.get('editedFieldView')) {
        // Some field is being edited, ignore
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
        // We get the label to show from VIE's type system
        var label = this.predicate;
        var attributeDef = this.model.get('@type').attributes.get(this.predicate);
        if (attributeDef && attributeDef.metadata) {
          label = attributeDef.metadata.label;
        }

        Drupal.edit.toolbar.get(this.$el)
        .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.info))')
        .append(Drupal.theme('editToolgroup', {
          classes: 'info',
          buttons: [
            {
              url: '#',
              label: label,
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

      // Animations.
      setTimeout(function () {
        self.$el.addClass('edit-highlighted');
        Drupal.edit.toolbar.show(self.$el, 'primary', 'info');
      }, 0);

      this.state.set('fieldBeingHighlighted', this.$el);
      this.state.set('highlightedEditable', this.model.id + ':' + this.predicate);
    },

    stopHighlight: function () {
      console.log('stopHighlight', this.model.id, this.predicate);

      // Animations
      Drupal.edit.toolbar.remove(this.$el);
      this.$el.removeClass('edit-highlighted');

      this.state.set('fieldBeingHighlighted', []);
      this.state.set('highlightedEditable', null);
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

      this.disableEditor();
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

      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      this.startHighlight();

      this.$el
      .addClass('edit-editing')
      .css('background-color', this.$el.data('edit-background-color'));

      // Ensure others are not editable when we are
      if (this.state.get('editedFieldView')) {
        this.state.get('editedFieldView').disableEditor();
      }

      // Hide the curtain while editing
      //Drupal.edit.util.findEntityForField(this.$el).find('.comment-wrapper .edit-curtain').height(0);

      // Enable the toolbar with the save and close buttons
      this.enableToolbar();

      // Start the Create.js editable widget
      this.enableEditableWidget();

      this.state.set('fieldBeingEdited', this.$el);
      this.state.set('editedEditable', Drupal.edit.util.getID(this.$el));
      this.state.set('editedFieldView', this);
    },

    enableEditableWidget: function () {
      this.$el.createEditable({
        vie: this.vie,
        disabled: false
      });
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
      console.log('disableEditor', this.model.id, this.predicate);

      this.$el
      .removeClass('edit-editing')
      .css('background-color', '');

      // TODO: Restore curtain height

      // Stop the Create.js editable widget
      this.disableEditableWidget();

      Drupal.edit.toolbar.remove(this.$el);

      this.state.set('fieldBeingEdited', []);
      this.state.set('editedEditable', null);
      this.state.set('editedFieldView', null);


    },

    disableEditableWidget: function () {
      this.$el.createEditable({
        vie: this.vie,
        disabled: true
      });
    },

    editorEnabled: function () {
      console.log("editorenabled", this.model.id, this.predicate);
      // Avoid re-"padding" of editable.
      if (!this.editing) {
        this.padEditable();
      }

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
        this.$el.addClass('edit-wysiwyg-attached');
      }
      Drupal.edit.toolbar.show(this.$el, 'secondary', 'wysiwyg-tabs');
      Drupal.edit.toolbar.show(this.$el, 'tertiary', 'wysiwyg');
      // Show the ops (save, close) as well.
      Drupal.edit.toolbar.show(this.$el, 'secondary', 'ops');
      // hmm, why in the DOM?
      this.$el.data('edit-content-changed', false);
      this.$el.trigger('edit-form-loaded.edit');
      this.editing = true;
    },

    saveClicked: function (event) {
      this.$el.blur();
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      // Find entity and predicate.
      var entity = Drupal.edit.vie.entities.get(Drupal.edit.util.getElementSubject(this.$el));
      var predicate = this.predicate;
      // Drupal.edit.form.saveForm loads and saves form if necessary.
      Drupal.edit.form.saveForm(entity, predicate, this.$el, this.model.get(this.predicate), function() {
        // Editable has been saved.
      });
    },

    closeClicked: function (event) {
      event.stopPropagation();
      event.preventDefault();
      // @TODO - handle dirty state.
      // Disable the editor for the time being, but allow the editable to be
      // re-enabled on click if needed.
      this.disableEditor();
    },

    padEditable: function () {
      var self = this;
      // Add 5px padding for readability. This means we'll freeze the current
      // width and *then* add 5px padding, hence ensuring the padding is added "on
      // the outside".
      // 1) Freeze the width (if it's not already set); don't use animations.
      if (this.$el[0].style.width === "") {
        this.$el
        .data('edit-width-empty', true)
        .addClass('edit-animate-disable-width')
        .css('width', this.$el.width());
      }

      // 2) Add padding; use animations.
      var posProp = Drupal.edit.util.getPositionProperties(this.$el);
      var $toolbar = Drupal.edit.toolbar.get(this.$el);
      setTimeout(function() {
        // Re-enable width animations (padding changes affect width too!).
        self.$el.removeClass('edit-animate-disable-width');

        // The whole toolbar must move to the top when it's an inline editable.
        if (self.$el.css('display') == 'inline') {
          $toolbar.css('top', parseFloat($toolbar.css('top')) - 5 + 'px');
        }

        // The primary toolgroups must move to the top and the left.
        $toolbar.find('.edit-toolbar.primary .edit-toolgroup')
        .addClass('edit-animate-exception-grow')
        .css({'position': 'relative', 'top': '-5px', 'left': '-5px'});

        // The secondary toolgroups must move to the top and the right.
        $toolbar.find('.edit-toolbar.secondary .edit-toolgroup')
        .addClass('edit-animate-exception-grow')
        .css({'position': 'relative', 'top': '-5px', 'left': '5px'});

        // The tertiary toolgroups must move to the top and the left, and must
        // increase their width.
        $toolbar.find('.edit-toolbar.tertiary .edit-toolgroup')
        .addClass('edit-animate-exception-grow')
        .css({'position': 'relative', 'top': '-5px', 'left': '-5px', 'width': self.$el.width() + 5});

        // Pad the editable.
        self.$el
        .css({
          'position': 'relative',
          'top':  posProp['top']  - 5 + 'px',
          'left': posProp['left'] - 5 + 'px',
          'padding-top'   : posProp['padding-top']    + 5 + 'px',
          'padding-left'  : posProp['padding-left']   + 5 + 'px',
          'padding-right' : posProp['padding-right']  + 5 + 'px',
          'padding-bottom': posProp['padding-bottom'] + 5 + 'px',
          'margin-bottom':  posProp['margin-bottom'] - 10 + 'px'
        });
      }, 0);
    },

    unpadEditable: function () {
      var self = this;

      // 1) Set the empty width again.
      if (this.$el.data('edit-width-empty') === true) {
        console.log('restoring width');
        this.$el
        .addClass('edit-animate-disable-width')
        .css('width', '');
      }

      // 2) Remove padding; use animations (these will run simultaneously with)
      // the fading out of the toolbar as its gets removed).
      var posProp = Drupal.edit.util.getPositionProperties(this.$el);
      var $toolbar = Drupal.edit.toolbar.get(this.$el);

      setTimeout(function() {
        // Re-enable width animations (padding changes affect width too!).
        self.$el.removeClass('edit-animate-disable-width');

        // Move the toolbar & toolgroups to their original positions.
        if (self.$el.css('display') == 'inline') {
          $toolbar.css('top', parseFloat($toolbar.css('top')) + 5 + 'px');
        }
        $toolbar.find('.edit-toolgroup')
        .removeClass('edit-animate-exception-grow')
        .css({'position': '', 'top': '', 'left': '', 'width': ''});

        // Undo our changes to the clipping (to prevent the bottom box-shadow).
        $toolbar
        .undelegate('.edit-toolbar', Drupal.edit.const.transitionEnd)
        .find('.edit-toolbar').css('clip', '');

        // Unpad the editable.
        self.$el
        .css({
          'position': 'relative',
          'top':  posProp['top']  + 5 + 'px',
          'left': posProp['left'] + 5 + 'px',
          'padding-top'   : posProp['padding-top']    - 5 + 'px',
          'padding-left'  : posProp['padding-left']   - 5 + 'px',
          'padding-right' : posProp['padding-right']  - 5 + 'px',
          'padding-bottom': posProp['padding-bottom'] - 5 + 'px',
          'margin-bottom': posProp['margin-bottom'] + 10 + 'px'
        });
      }, 0);
    },

    editorDisabled: function () {
      // Avoid re-"unpadding" of editable.
      if (this.editing) {
        this.unpadEditable();
      }
      this.$el.removeClass('ui-state-disabled');
      this.$el.removeClass('edit-wysiwyg-attached');

      this.editing = false;
    },

    contentChanged: function () {
      this.$el.data('edit-content-changed', true);
      this.$el.trigger('edit-content-changed.edit');

      Drupal.edit.toolbar.get(this.$el)
      .find('a.save')
      .addClass('blue-button')
      .removeClass('gray-button')
    }
  });

  // ## FormEditableFieldView
  //
  // This view is a subtype of the FieldView that is used for the
  // elements Spark edits via regular Drupal forms.
  Drupal.edit.views.FormEditableFieldView = Drupal.edit.views.EditableFieldView.extend({

    enableEditableWidget: function () {
      this.$el.createEditable({
        vie: this.vie,
        disabled: false
      });
    },

    disableEditableWidget: function () {
      this.$el.createEditable({
        vie: this.vie,
        disabled: true
      });
      $('#edit_backstage form').remove();
    },

    saveClicked: function (event) {
      // Stop events.
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      var value = this.model.get(this.predicate);
      var entity = Drupal.edit.vie.entities.get(Drupal.edit.util.getElementSubject(this.$el));
      var that = this;

      Drupal.edit.form.saveForm(entity, this.predicate, this.$el, null, function(error, $el) {
        // Restart the editable.
        that.startEditable();
      });
    }

  });

})(jQuery);
