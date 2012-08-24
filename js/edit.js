(function ($) {

Drupal.edit = Drupal.edit || {};
Drupal.edit.wysiwyg = Drupal.edit.wysiwyg || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    $('#edit_view-edit-toggles').once('edit-init', Drupal.edit.init);
    $('#edit_view-edit-toggles').once('edit-toggle', Drupal.edit.toggle.render);

    // Remove URLs for the edit toggle links so we don't get redirects
    $("a.edit_view-edit-toggle").attr('href', '#');
  }
};

Drupal.edit.const = {};
Drupal.edit.const.transitionEnd = "transitionEnd.edit webkitTransitionEnd.edit transitionend.edit msTransitionEnd.edit oTransitionEnd.edit";

Drupal.edit.init = function() {
  // VIE instance for Editing
  Drupal.edit.vie = new VIE();

  // The state of Spark Edit is handled in a Backbone model
  Drupal.edit.StateModel = Backbone.Model.extend({
    defaults: {
      isViewing: true,
      entityBeingHighlighted: [],
      fieldBeingHighlighted: [],
      fieldBeingEdited: [],
      higlightedEditable: null,
      editedEditable: null,
      queues: {},
      wysiwygReady: false
    }
  });

  // We always begin in view mode.
  Drupal.edit.state = new Drupal.edit.StateModel();

  // Load the storage widget to get localStorage support
  $('body').midgardStorage({
    vie: Drupal.edit.vie,
    editableNs: 'createeditable'
  });

  // Form preloader.
  Drupal.edit.state.set('queues', {
    preload: Drupal.edit.util.findEditableFields().filter('.edit-type-form').map(function () {
      return Drupal.edit.util.getID($(this));
    })
  });
  console.log('Fields with (server-generated) forms:', Drupal.edit.state.get('queues').preload);

  // Initialize WYSIWYG, if any.
  if (Drupal.settings.edit.wysiwyg) {
    $(document).bind('edit-wysiwyg-ready.edit', function() {
      Drupal.edit.state.set('wysiwygReady', true);
      console.log('edit: WYSIWYG ready');
    });
    Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].init();
  }

  // Create a backstage area.
  $(Drupal.theme('editBackstage', {})).appendTo('body');

  // Transition between view/edit states.
  $("a.edit_view-edit-toggle").bind('click.edit', function() {
    var wasViewing = Drupal.edit.state.get('isViewing');
    var isViewing = $(this).hasClass('edit-view');
    Drupal.edit.state.set('isViewing', isViewing);

    // Swap active class among the two links.
    $('a.edit_view-edit-toggle').parent().removeClass('active');
    $('a.edit_view-edit-toggle.edit-' + (isViewing ? 'view' : 'edit')).parent().addClass('active');

    if (wasViewing && !isViewing) {
      Drupal.edit.enterEditState();
    } else if (!wasViewing && isViewing) {
      Drupal.edit.enterViewState();
    }
    return false;
  });
};

Drupal.edit.enterEditState = function () {
  $(Drupal.theme('editOverlay', {}))
  .appendTo('body')
  .addClass('edit-animate-slow edit-animate-invisible')
  .bind('click.edit', Drupal.edit.clickOverlay);

  var $e = Drupal.edit.util.findEditableFields();
  Drupal.edit.startEditableWidgets($e);

  // TODO: preload forms. We could do one request per form, but that's more
  // RTTs than needed. Instead, the server should support batch requests.
  console.log('Preloading forms that we might need!', Drupal.edit.state.get('queues').preload);

  // Animations.
  $('#edit_overlay').css('top', $('#navbar').outerHeight());
  $('#edit_overlay').removeClass('edit-animate-invisible');

  // Disable contextual links in edit mode.
  $('.contextual-links-region')
  .addClass('edit-contextual-links-region')
  .removeClass('contextual-links-region');
};

Drupal.edit.enterViewState = function () {
  // Animations.
  $('#edit_overlay')
  .addClass('edit-animate-invisible')
  .bind(Drupal.edit.const.transitionEnd, function(e) {
    $('#edit_overlay, .edit-form-container, .edit-toolbar-container, #edit_modal, #edit_backstage, .edit-curtain').remove();
  });

  var $e = Drupal.edit.util.findEditableFields();
  Drupal.edit.stopEditableWidgets($e);

  // Re-enable contextual links in view mode.
  $('.edit-contextual-links-region')
  .addClass('contextual-links-region')
  .removeClass('edit-contextual-links-region');
};

Drupal.edit.startEditableWidgets = function($fields) {
  var self = this;

  var enabler = function () {
    if (Drupal.edit.state.get('isViewing')) {
      $(this).unbind('click', enabler);
      return;
    }

    // Make the fields editable
    Drupal.edit.editables.startEdit($(this));
    return false;
  };

  $fields
  .each(function() {
    var $field = jQuery(this);

    $field.bind('createeditableenable', function (event, data) {
      $field.unbind('click.edit', enabler);
      Drupal.edit.editables._updateDirectEditable($field);
    });

    $field.bind('createeditabledisable', function (event, data) {
      $field.bind('click.edit', enabler);
      $field.removeClass('ui-state-disabled');
      Drupal.edit.editables._restoreDirectEditable($field);
    });

    var entity = Drupal.edit.util.getElementEntity(this, Drupal.edit.vie);
    $field.createEditable({
      model: entity,
      vie: Drupal.edit.vie,
      disabled: true
    });
  });

  Drupal.edit.decorateEditables(Drupal.edit.util.findEditablesForFields($fields));
};

Drupal.edit.decorateEditables = function($editables) {
  $editables
  .addClass('edit-animate-fast')
  .addClass('edit-candidate edit-editable')
  .bind('mouseenter.edit', function(e) {
    var $editable = $(this);
    Drupal.edit.util.ignoreHoveringVia(e, '.edit-toolbar-container', function() {
      console.log('field:mouseenter');
      if (!$editable.hasClass('edit-editing')) {
        Drupal.edit.editables.startHighlight($editable);
      }
      // Prevents the entity's mouse enter event from firing, in case their borders are one and the same.
      e.stopPropagation();
    });
  })
  .bind('mouseleave.edit', function(e) {
    var $editable = $(this);
    Drupal.edit.util.ignoreHoveringVia(e, '.edit-toolbar-container', function() {
      console.log('field:mouseleave');
      if (!$editable.hasClass('edit-editing')) {
        Drupal.edit.editables.stopHighlight($editable);
        // Leaving a field won't trigger the mouse enter event for the entity
        // because the entity contains the field. Hence, do it manually.
        var $e = Drupal.edit.util.findEntityForEditable($editable);
        Drupal.edit.entityEditables.startHighlight($e);
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });
  })
  .each(function() {
    var editableView = new Drupal.edit.views.EditableView({
      model: Drupal.edit.util.getElementEntity(jQuery(this), Drupal.edit.vie),
      el: jQuery(this),
      predicate: Drupal.edit.util.getElementPredicate(jQuery(this))
    });
  })
  // Some transformations are editable-specific.
  .map(function() {
    $(this).data('edit-background-color', Drupal.edit.util.getBgColor($(this)));
  });
};

Drupal.edit.stopEditableWidgets = function($fields) {
  var $editables = Drupal.edit.util.findEditablesForFields($fields);

  $fields
  .removeClass('edit-processed');
  
  Drupal.edit.editables.stopEdit($fields);

  $editables
  .removeClass('edit-candidate edit-editable edit-highlighted edit-editing edit-belowoverlay')
  .unbind('mouseenter.edit mouseleave.edit click.edit edit-content-changed.edit')
};

Drupal.edit.clickOverlay = function(e) {
  console.log('clicked overlay');

  if (Drupal.edit.modal.get().length == 0) {
    Drupal.edit.toolbar.get(Drupal.edit.state.get('fieldBeingEdited'))
    .find('a.close').trigger('click.edit');
  }
};

/*
1. Editable Entities
2. Editable Fields (are associated with Editable Entities, but are not
   necessarily *inside* Editable Entities — e.g. title)
    -> contains exactly one Editable, in which the editing itself occurs, this
       can be either:
         a. type=direct, here some child element of the Field element is marked as editable
         b. type=form, here the field itself is marked as editable, upon edit, a form is used
 */

// Entity editables.
Drupal.edit.entityEditables = {
  startHighlight: function($editable) {
    console.log('entityEditables.startHighlight');
    if (Drupal.edit.toolbar.create($editable)) {
      var label = Drupal.t('Edit !entity', { '!entity': $editable.data('edit-entity-label') });
      var $toolbar = Drupal.edit.toolbar.get($editable);

      $toolbar
      .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.entity))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'entity',
        buttons: [
          { url: $editable.data('edit-entity-edit-url'), label: label, classes: 'blue-button label' },
        ]
      }))
      .delegate('a.label', 'click.edit', function(e) {
        // Disable edit mode, then let the normal behavior (i.e. open the full
        // entity edit form) go through.
        $('#edit_view-edit-toggle input[value="view"]').trigger('click.edit');
      });

      // TODO: improve this; currently just a hack for Garland compatibility.
      if ($editable.css('margin-left')) {
        $toolbar.css('margin-left', $editable.css('margin-left'));
      }
    }

    // Animations.
    setTimeout(function() {
      $editable.addClass('edit-highlighted');
      Drupal.edit.toolbar.show($editable, 'primary', 'entity');
    }, 0);

    Drupal.edit.state.set('entityBeingHighlighted', $editable);
  },

  stopHighlight: function($editable) {
    console.log('entityEditables.stopHighlight');

    // Animations.
    $editable.removeClass('edit-highlighted');
    Drupal.edit.toolbar.remove($editable);

    Drupal.edit.state.set('entityBeingHiglighted', []);
  }
};

// Field editables.
Drupal.edit.editables = {
  startHighlight: function($editable) {
    console.log('editables.startHighlight');
    if (Drupal.edit.state.get('entityBeingHighlighted').length > 0) {
      var $e = Drupal.edit.util.findEntityForEditable($editable);
      Drupal.edit.entityEditables.stopHighlight($e);
    }
    if (Drupal.edit.toolbar.create($editable)) {
      var label = Drupal.edit.util.getPredicateLabel($editable);

      Drupal.edit.toolbar.get($editable)
      .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.info))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'info',
        buttons: [
          { url: '#', label: label, classes: 'blank-button label', hasButtonRole: false },
        ]
      }))
      .delegate('a.label', 'click.edit', function(e) {
        // Clicking the label equals clicking the editable itself.
        $editable.trigger('click.edit');
        return false;
      });
    }

    // Animations.
    setTimeout(function() {
      $editable.addClass('edit-highlighted');
      Drupal.edit.toolbar.show($editable, 'primary', 'info');
    }, 0);

    Drupal.edit.state.set('fieldBeingHighlighted', $editable);
    Drupal.edit.state.set('higlightedEditable', Drupal.edit.util.getID(Drupal.edit.util.findFieldForEditable($editable)));
  },

  stopHighlight: function($editable) {
    console.log('editables.stopHighlight');
    if ($editable.length == 0) {
      return;
    }

    // Animations.
    Drupal.edit.toolbar.remove($editable);
    $editable.removeClass('edit-highlighted');

    Drupal.edit.state.set('fieldBeingHighlighted', []);
    Drupal.edit.state.set('highlightedEditable', null);
  },

  startEdit: function($field) {
    $editable = Drupal.edit.util.findEditablesForFields($field);
    if ($editable.hasClass('edit-editing')) {
      return;
    }

    console.log('editables.startEdit: ', $editable);
    var self = this;

    // Highlight if not already highlighted.
    if (Drupal.edit.state.get('fieldBeingHighlighted')[0] != $editable[0]) {
      Drupal.edit.editables.startHighlight($editable);
    }

    $editable
    .addClass('edit-editing')
    .bind('edit-content-changed.edit', function(e) {
      self._buttonFieldSaveToBlue(e, $editable, $field);
    })
    // Some transformations are editable-specific.
    .map(function() {
      $(this).css('background-color', $(this).data('edit-background-color'));
    });

    // While editing, don't show *any* other field or entity as editable.
    $('.edit-candidate').not('.edit-editing').removeClass('edit-editable');
    // Hide the curtain while editing, the above already prevents comments from
    // showing up.
    Drupal.edit.util.findEntityForField($field).find('.comment-wrapper .edit-curtain').height(0);

    // Toolbar (already created in the highlight).
    Drupal.edit.toolbar.get($editable)
    .addClass('edit-editing')
    .find('.edit-toolbar.secondary:not(:has(.edit-toolgroup.ops))')
    .append(Drupal.theme('editToolgroup', {
      classes: 'ops',
      buttons: [
        { url: '#', label: Drupal.t('Save'), classes: 'field-save save gray-button' },
        { url: '#', label: '<span class="close"></span>', classes: 'field-close close gray-button' }
      ]
    }))
    .delegate('a.field-save', 'click.edit', function(e) {
      return self._buttonFieldSaveClicked(e, $editable, $field);
    })
    .delegate('a.field-close', 'click.edit', function(e) {
      return self._buttonFieldCloseClicked(e, $editable, $field);
    });

    // Start the editable widget
    $field.createEditable({disabled: false});

    // Regardless of the type, load the form for this field. We always use forms
    // to submit the changes.
    // FIXME: This should be handled by Backbone.sync
    self._loadForm($editable, $field);

    Drupal.edit.state.set('fieldBeingEdited', $editable);
    Drupal.edit.state.set('editedEditable', Drupal.edit.util.getID($field));
  },

  stopEdit: function($field) {
    $editable = Drupal.edit.util.findEditablesForFields($field);
    console.log('editables.stopEdit: ', $editable);
    var self = this;
    if ($editable.length == 0) {
      return;
    }

    $editable
    .removeClass('edit-highlighted edit-editing edit-belowoverlay')
    // Some transformations are editable-specific.
    .map(function() {
      $(this).css('background-color', '');
    });

    // Make the other fields and entities editable again.
    $('.edit-candidate').addClass('edit-editable');
    // Restore curtain to original height.
    var $curtain = Drupal.edit.util.findEntityForEditable($editable)
                   .find('.comment-wrapper .edit-curtain');
    $curtain.height($curtain.data('edit-curtain-height'));

    // Start the editable widget
    $field.createEditable({disabled: true});

    Drupal.edit.toolbar.remove($editable);
    Drupal.edit.form.remove($editable);

    Drupal.edit.state.set('fieldBeingEdited', []);
    Drupal.edit.state.set('editedEditable', null);
  },

  _loadRerenderedProcessedText: function($editable, $field) {
    // Indicate in the 'info' toolgroup that the form is loading.
    Drupal.edit.toolbar.addClass($editable, 'primary', 'info', 'loading');

    var edit_id = Drupal.edit.util.getID($field);
    var element_settings = {
      url      : Drupal.edit.util.calcRerenderProcessedTextURL(edit_id),
      event    : 'edit-internal-load-rerender.edit',
      $field   : $field,
      $editable: $editable,
      submit   : { nocssjs : true },
      progress : { type : null }, // No progress indicator.
    };
    if (Drupal.ajax.hasOwnProperty(edit_id)) {
      delete Drupal.ajax[edit_id];
      $editable.unbind('edit-internal-load-rerender.edit');
    }
    Drupal.ajax[edit_id] = new Drupal.ajax(edit_id, $editable, element_settings);
    $editable.trigger('edit-internal-load-rerender.edit');
  },

  // Attach, activate and show the WYSIWYG editor.
  _wysiwygify: function($editable) {
    $editable.addClass('edit-wysiwyg-attached');
    Drupal.edit.toolbar.show($editable, 'secondary', 'wysiwyg-tabs');
    Drupal.edit.toolbar.show($editable, 'tertiary', 'wysiwyg');
  },

  _updateDirectEditable: function($field) {
    $editable = Drupal.edit.util.findEditablesForFields($field);
    Drupal.edit.editables._padEditable($editable);

    if ($field.hasClass('edit-type-direct-with-wysiwyg')) {
      Drupal.edit.toolbar.get($editable)
      .find('.edit-toolbar.secondary:not(:has(.edit-toolgroup.wysiwyg-tabs))')
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

      // When transformation filters have been been applied to the processed
      // text of this field, then we'll need to load a re-rendered version of
      // it without the transformation filters.
      if ($field.hasClass('edit-text-with-transformation-filters')) {
        Drupal.edit.editables._loadRerenderedProcessedText($editable, $field);
      }
      // When no transformation filters have been applied: start WYSIWYG editing
      // immediately!
      else {
        setTimeout(function() {
          Drupal.edit.editables._wysiwygify($editable);
        }, 0);
      }
    }

    $editable
    .data('edit-content-changed', false);

    $field.bind('createeditablechanged', function() {
      $editable.data('edit-content-changed', true);
      $editable.trigger('edit-content-changed.edit');
    });
  },

  _restoreDirectEditable: function($field) {
    $editable = Drupal.edit.util.findEditablesForFields($field);
    if (Drupal.edit.util.findFieldForEditable($editable).hasClass('edit-type-direct-with-wysiwyg')
        && $editable.hasClass('edit-wysiwyg-attached'))
    {
      $editable.removeClass('edit-wysiwyg-attached');
    }

    Drupal.edit.editables._unpadEditable($editable);

    $editable
    .unbind('blur.edit keyup.edit paste.edit edit-content-changed.edit');

    // Not only clean up the changes to $editable, but also clean up the
    // backstage area, where we hid the form that we used to send the changes.
    $('#edit_backstage form').remove();
  },

  _padEditable: function($editable) {
    // Add 5px padding for readability. This means we'll freeze the current
    // width and *then* add 5px padding, hence ensuring the padding is added "on
    // the outside".
    // 1) Freeze the width (if it's not already set); don't use animations.
    if ($editable[0].style.width === "") {
      $editable
      .data('edit-width-empty', true)
      .addClass('edit-animate-disable-width')
      .css('width', $editable.width());
    }
    // 2) Add padding; use animations.
    var posProp = Drupal.edit.util.getPositionProperties($editable);
    var $toolbar = Drupal.edit.toolbar.get($editable);
    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      $editable.removeClass('edit-animate-disable-width');

      // The whole toolbar must move to the top when it's an inline editable.
      if ($editable.css('display') == 'inline') {
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
      .css({'position': 'relative', 'top': '-5px', 'left': '-5px', 'width': $editable.width() + 5});

      // The clipping (to get rid of the bottom box-shadow) needs to be updated.
      $toolbar
      .delegate('.edit-toolbar', Drupal.edit.const.transitionEnd, function(e) {
        // @todo: this was disabled to make the AE multiSplit override (p/h1/... dropdown) visible.
        return;
        var $this = $(this);
        if (!$this.data('edit-toolbar-updating-clipping')) {
          $this.data('edit-toolbar-updating-clipping', true);

          var parts = $this.css('clip').split(' ');
          parts[2] = parseFloat(parts[2]) - 5 + 'px';
          $this.css('clip', parts.join(' '));
        }
      });

      // Pad the editable.
      $editable
      .css({
        'position': 'relative',
        'top':  posProp['top']  - 5 + 'px',
        'left': posProp['left'] - 5 + 'px',
        'padding-top'   : posProp['padding-top']    + 5 + 'px',
        'padding-left'  : posProp['padding-left']   + 5 + 'px',
        'padding-right' : posProp['padding-right']  + 5 + 'px',
        'padding-bottom': posProp['padding-bottom'] + 5 + 'px',
        'margin-bottom':  posProp['margin-bottom'] - 10 + 'px',
      });
    }, 0);
  },

  _unpadEditable: function($editable) {
    // 1) Set the empty width again.
    if ($editable.data('edit-width-empty') === true) {
      console.log('restoring width');
      $editable
      .addClass('edit-animate-disable-width')
      .css('width', '');
    }
    // 2) Remove padding; use animations (these will run simultaneously with)
    // the fading out of the toolbar as its gets removed).
    var posProp = Drupal.edit.util.getPositionProperties($editable);
    var $toolbar = Drupal.edit.toolbar.get($editable);
    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      $editable.removeClass('edit-animate-disable-width');

      // Move the toolbar & toolgroups to their original positions.
      if ($editable.css('display') == 'inline') {
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
      $editable
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

  _loadForm: function($editable, $field) {
    var edit_id = Drupal.edit.util.getID($field);
    var element_settings = {
      url      : Drupal.edit.util.calcFormURLForField(edit_id),
      event    : 'edit-internal.edit',
      $field   : $field,
      $editable: $editable,
      submit   : { nocssjs : ($field.hasClass('edit-type-direct')) },
      progress : { type : null }, // No progress indicator.
    };
    if (Drupal.ajax.hasOwnProperty(edit_id)) {
      delete Drupal.ajax[edit_id];
      $editable.unbind('edit-internal.edit');
    }
    Drupal.ajax[edit_id] = new Drupal.ajax(edit_id, $editable, element_settings);
    $editable.trigger('edit-internal.edit');
  },

  _buttonFieldSaveToBlue: function(e, $editable, $field) {
    Drupal.edit.toolbar.get($editable)
    .find('a.save').addClass('blue-button').removeClass('gray-button');
  },

  _buttonFieldSaveClicked: function(e, $editable, $field) {
    // type = form
    if ($field.hasClass('edit-type-form')) {
      Drupal.edit.form.get($field).find('form')
      .find('.edit-form-submit').trigger('click.edit').end();
    }
    // type = direct
    else if ($field.hasClass('edit-type-direct')) {
      $editable.blur();

      var entity = Drupal.edit.util.getElementEntity($field, Drupal.edit.vie);
      var value = entity.get(Drupal.edit.util.getElementPredicate($editable));

      // TODO: Use Backbone.sync so we can support the Drupal 8 API 
      // without code changes in Spark
      // entity.save();

      $('#edit_backstage form')
      .find(':input[type!="hidden"][type!="submit"]').val(value).end()
      .find('.edit-form-submit').trigger('click.edit');
    }
    return false;
  },

  _buttonFieldCloseClicked: function(e, $editable, $field) {
    if (!Drupal.edit.util.getElementEntity($field, Drupal.edit.vie).hasChanged()) {
      // Content not changed: stop editing field.
      // The view will restore contents automatically when we disable editor
      Drupal.edit.editables.stopEdit($field);
    } else {
      // Content changed: show modal.
      Drupal.edit.modal.create(
        Drupal.t('You have unsaved changes'),
        Drupal.theme('editButtons', { 'buttons' : [
          { url: '#', classes: 'gray-button discard', label: Drupal.t('Discard changes') },
          { url: '#', classes: 'blue-button save', label: Drupal.t('Save') }
        ]}),
        $editable
      );
      setTimeout(Drupal.edit.modal.show, 0);
    };
    return false;
  }
};

})(jQuery);
