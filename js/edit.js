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

    // TODO: remove this; this is to make the current prototype somewhat usable.
    $('a.edit_view-edit-toggle').click(function() {
      $(this).trigger('click.edit');
    });
  }
};

Drupal.edit.const = {};
Drupal.edit.const.transitionEnd = "transitionEnd.edit webkitTransitionEnd.edit transitionend.edit msTransitionEnd.edit oTransitionEnd.edit";

Drupal.edit.init = function() {
  Drupal.edit.state = {};
  // We always begin in view mode.
  Drupal.edit.state.isViewing = true;
  Drupal.edit.state.entityBeingHighlighted = [];
  Drupal.edit.state.fieldBeingHighlighted = [];
  Drupal.edit.state.fieldBeingEdited = [];
  Drupal.edit.state.higlightedEditable = null;
  Drupal.edit.state.editedEditable = null;
  Drupal.edit.state.queues = {};
  Drupal.edit.state.wysiwygReady = false;

  // Build inventory.
  var IDMapper = function() { return Drupal.edit.getID($(this)); };
  Drupal.edit.state.entities = Drupal.edit.findEditableEntities().map(IDMapper);
  Drupal.edit.state.fields = Drupal.edit.findEditableFields().map(IDMapper);
  console.log('Entities:', Drupal.edit.state.entities.length, ';', Drupal.edit.state.entities);
  console.log('Fields:', Drupal.edit.state.fields.length, ';', Drupal.edit.state.fields);

  // Form preloader.
  Drupal.edit.state.queues.preload = Drupal.edit.findEditableFields().filter('.edit-type-form').map(IDMapper);
  console.log('Fields with (server-generated) forms:', Drupal.edit.state.queues.preload);

  // Initialize WYSIWYG, if any.
  if (Drupal.settings.edit.wysiwyg) {
    $(document).bind('edit-wysiwyg-ready.edit', function() {
      Drupal.edit.state.wysiwygReady = true;
      console.log('edit: WYSIWYG ready');
    });
    Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].init();
  }

  // Create a backstage area.
  $(Drupal.theme('editBackstage', {})).appendTo('body');

  // Transition between view/edit states.
  $("a.edit_view-edit-toggle").bind('click.edit', function() {
    var wasViewing = Drupal.edit.state.isViewing;
    var isViewing  = Drupal.edit.state.isViewing = $(this).hasClass('edit-view');
    // Swap active class among the two links.
    $('a.edit_view-edit-toggle').parent().removeClass('active');
    $('a.edit_view-edit-toggle.edit-' + (isViewing ? 'view' : 'edit')).parent().addClass('active');

    if (wasViewing && !isViewing) {
      $(Drupal.theme('editOverlay', {}))
      .appendTo('body')
      .addClass('edit-animate-slow edit-animate-invisible')
      .bind('click.edit', Drupal.edit.clickOverlay);;

      var $f = Drupal.edit.findEditableFields();
      Drupal.edit.startEditableFields($f);
      var $e = Drupal.edit.findEditableEntities();
      // Drupal.edit.startEditableEntities($e);

      // TODO: preload forms. We could do one request per form, but that's more
      // RTTs than needed. Instead, the server should support batch requests.
      console.log('Preloading forms that we might need!', Drupal.edit.state.queues.preload);

      // Animations.
      $('#edit_overlay').css('top', $('#navbar').outerHeight());
      $('#edit_overlay').removeClass('edit-animate-invisible');

      // Disable contextual links in edit mode.
      $('.contextual-links-region')
      .addClass('edit-contextual-links-region')
      .removeClass('contextual-links-region');
    }
    else if (!wasViewing && isViewing) {
      // Animations.
      $('#edit_overlay')
      .addClass('edit-animate-invisible')
      .bind(Drupal.edit.const.transitionEnd, function(e) {
        $('#edit_overlay, .edit-form-container, .edit-toolbar-container, #edit_modal, #edit_backstage, .edit-curtain').remove();
      });

      var $f = Drupal.edit.findEditableFields();
      Drupal.edit.stopEditableFields($f);
      var $e = Drupal.edit.findEditableEntities();
      Drupal.edit.stopEditableEntities($e);

      // Re-enable contextual links in view mode.
      $('.edit-contextual-links-region')
      .addClass('contextual-links-region')
      .removeClass('edit-contextual-links-region');
    }
    else {
      // No state change.
    }
    return false;
  });
};

Drupal.edit.findEditableEntities = function(context) {
  return $('.edit-entity.edit-allowed', context || Drupal.settings.edit.context);
};

Drupal.edit.findEditableFields = function(context) {
  return $('.edit-field.edit-allowed', context || Drupal.settings.edit.context);
};

/*
 * findEditableFields() just looks for fields that are editable, i.e. for the
 * field *wrappers*. Depending on the field, however, either the whole field wrapper
 * will be marked as editable (in this case, an inline form will be used for editing),
 * *or* a specific (field-specific even!) DOM element within that field wrapper will be
 * marked as editable.
 * This function is for finding the *editables* themselves, given the *editable fields*.
 */
Drupal.edit.findEditablesForFields = function($fields) {
  var $editables = $();

  // type = form
  $editables = $editables.add($fields.filter('.edit-type-form'));

  // type = direct
  var $direct = $fields.filter('.edit-type-direct');
  $editables = $editables.add($direct.find('.field-item'));
  // Edge case: "title" pseudofield on pages with lists of nodes.
  $editables = $editables.add($direct.filter('h2').find('a'));
  // Edge case: "title" pseudofield on node pages.
  $editables = $editables.add($direct.find('h1'));

  return $editables;
};

Drupal.edit.getID = function($field) {
  return $field.data('edit-id');
};

Drupal.edit.findFieldForID = function(id, context) {
  return $('[data-edit-id="' + id + '"]', context || $('#content'));
};

Drupal.edit.findFieldForEditable = function($editable) {
  return $editable.filter('.edit-type-form').length ? $editable : $editable.closest('.edit-type-direct');
};

Drupal.edit.findEntityForField = function($f) {
  var $e = $f.closest('.edit-entity');
  if ($e.length == 0) {
    var entity_edit_id = $f.data('edit-id').split(':').slice(0,2).join(':');
    $e = $('.edit-entity[data-edit-id="' + entity_edit_id + '"]');
  }
  return $e;
};

Drupal.edit.findEntityForEditable = function($editable) {
  return Drupal.edit.findEntityForField(Drupal.edit.findFieldForEditable($editable));
};

Drupal.edit.startEditableEntities = function($e) {
  $e
  .once('edit')
  .addClass('edit-animate-fast')
  .addClass('edit-candidate edit-editable')
  .bind('mouseenter.edit', function(e) {
    var $e = $(this);
    Drupal.edit.util.ignoreHoveringVia(e, '.edit-toolbar-container', function() {
      if (Drupal.edit.state.fieldBeingEdited.length > 0) {
        return;
      }

      console.log('entity:mouseenter');
      Drupal.edit.entityEditables.startHighlight($e);
    });
  })
  .bind('mouseleave.edit', function(e) {
    var $e = $(this);
    Drupal.edit.util.ignoreHoveringVia(e, '.edit-toolbar-container', function() {
      console.log('entity:mouseleave');
      Drupal.edit.entityEditables.stopHighlight($e);
    });
  })
  // Hang a curtain over the comments if they're inside the entity.
  .find('.comment-wrapper').prepend(Drupal.theme('editCurtain', {}))
  .map(function() {
    var height = $(this).height();
    $(this).find('.edit-curtain')
    .css('height', height)
    .data('edit-curtain-height', height);
  });
};

Drupal.edit.stopEditableEntities = function($e) {
  $e
  .removeClass('edit-processed edit-candidate edit-editable edit-highlighted')
  .unbind('mouseenter.edit mouseleave.edit')
  .find('.comment-wrapper .edit-curtain').remove();
};

Drupal.edit.startEditableFields = function($fields) {
  var $fields = $fields.once('edit');
  // Ignore fields that need a WYSIWYG editor if no WYSIWYG editor is present
  if (!Drupal.settings.edit.wysiwyg) {
    $fields = $fields.filter(':not(.edit-type-direct-with-wysiwyg)');
  }
  var $editables = Drupal.edit.findEditablesForFields($fields);

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
        var $e = Drupal.edit.findEntityForEditable($editable);
        Drupal.edit.entityEditables.startHighlight($e);
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });
  })
  .bind('click.edit', function() {
    Drupal.edit.editables.startEdit($(this)); return false;
  })
  // Some transformations are editable-specific.
  .map(function() {
    $(this).data('edit-background-color', Drupal.edit.util.getBgColor($(this)));
  });
};

Drupal.edit.stopEditableFields = function($fields) {
  var $editables = Drupal.edit.findEditablesForFields($fields);

  $fields
  .removeClass('edit-processed');

  $editables
  .removeClass('edit-candidate edit-editable edit-highlighted edit-editing edit-belowoverlay')
  .unbind('mouseenter.edit mouseleave.edit click.edit edit-content-changed.edit')
  .removeAttr('contenteditable')
  .removeData(['edit-content-original', 'edit-content-changed']);
};

Drupal.edit.clickOverlay = function(e) {
  console.log('clicked overlay');

  if (Drupal.edit.modal.get().length == 0) {
    Drupal.edit.toolbar.get(Drupal.edit.state.fieldBeingEdited)
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
    return;
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

    Drupal.edit.state.entityBeingHighlighted = $editable;
  },

  stopHighlight: function($editable) {
    return;
    console.log('entityEditables.stopHighlight');

    // Animations.
    $editable.removeClass('edit-highlighted');
    Drupal.edit.toolbar.remove($editable);

    Drupal.edit.state.entityBeingHiglighted = [];
  }
};

// Field editables.
Drupal.edit.editables = {
  startHighlight: function($editable) {
    console.log('editables.startHighlight');
    if (Drupal.edit.state.entityBeingHighlighted.length > 0) {
      var $e = Drupal.edit.findEntityForEditable($editable);
      Drupal.edit.entityEditables.stopHighlight($e);
    }
    if (Drupal.edit.toolbar.create($editable)) {
      var label = $editable.filter('.edit-type-form').data('edit-field-label')
        || $editable.closest('.edit-type-direct').data('edit-field-label');

      Drupal.edit.toolbar.get($editable)
      .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.info))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'info',
        buttons: [
          { url: '#', label: label, classes: 'blank-button label' },
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

    Drupal.edit.state.fieldBeingHighlighted = $editable;
    Drupal.edit.state.higlightedEditable = Drupal.edit.getID(Drupal.edit.findFieldForEditable($editable));
  },

  stopHighlight: function($editable) {
    console.log('editables.stopHighlight');
    if ($editable.length == 0) {
      return;
    }

    // Animations.
    Drupal.edit.toolbar.remove($editable);
    $editable.removeClass('edit-highlighted');

    Drupal.edit.state.fieldBeingHighlighted = [];
    Drupal.edit.state.highlightedEditable = null;
  },

  startEdit: function($editable) {
    if ($editable.hasClass('edit-editing')) {
      return;
    }

    console.log('editables.startEdit: ', $editable);
    var self = this;
    var $field = Drupal.edit.findFieldForEditable($editable);

    // Highlight if not already highlighted.
    if (Drupal.edit.state.fieldBeingHighlighted[0] != $editable[0]) {
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
    Drupal.edit.findEntityForField($field).find('.comment-wrapper .edit-curtain').height(0);

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

    // Changes to $editable based on the type.
    var callback = ($field.hasClass('edit-type-direct'))
      ? self._updateDirectEditable
      : self._updateFormEditable;
    callback($editable);

    // Regardless of the type, load the form for this field. We always use forms
    // to submit the changes.
    self._loadForm($editable, $field);

    Drupal.edit.state.fieldBeingEdited = $editable;
    Drupal.edit.state.editedEditable = Drupal.edit.getID($field);
  },

  stopEdit: function($editable) {
    console.log('editables.stopEdit: ', $editable);
    var self = this;
    var $field = Drupal.edit.findFieldForEditable($editable);
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
    var $curtain = Drupal.edit.findEntityForEditable($editable)
                   .find('.comment-wrapper .edit-curtain');
    $curtain.height($curtain.data('edit-curtain-height'));

    // Changes to $editable based on the type.
    var callback = ($field.hasClass('edit-type-direct'))
      ? self._restoreDirectEditable
      : self._restoreFormEditable;
    callback($editable);

    Drupal.edit.toolbar.remove($editable);
    Drupal.edit.form.remove($editable);

    Drupal.edit.state.fieldBeingEdited = [];
    Drupal.edit.state.editedEditable = null;
  },

  _loadRerenderedProcessedText: function($editable, $field) {
    // Indicate in the 'info' toolgroup that the form is loading.
    Drupal.edit.toolbar.addClass($editable, 'primary', 'info', 'loading');

    var edit_id = Drupal.edit.getID($field);
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
    Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].attach($editable);
    Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].activate($editable);
    Drupal.edit.toolbar.show($editable, 'secondary', 'wysiwyg-tabs');
    Drupal.edit.toolbar.show($editable, 'tertiary', 'wysiwyg');
  },

  _updateDirectEditable: function($editable) {
    Drupal.edit.editables._padEditable($editable);

    var $field = Drupal.edit.findFieldForEditable($editable);
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
        // Also store the "real" original content, i.e. the transformed one.
        $editable.data('edit-content-original-transformed', $editable.html())
      }
      // When no transformation filters have been applied: start WYSIWYG editing
      // immediately!
      else {
        setTimeout(function() {
          Drupal.edit.editables._wysiwygify($editable);
        }, 0);
      }
    }
    else {
      $editable.attr('contenteditable', true);
    }

    $editable
    .data('edit-content-original', $editable.html())
    .data('edit-content-changed', false);

    // Detect content changes ourselves only when not using a WYSIWYG editor.
    var markContentChanged = function() {
      $editable.data('edit-content-changed', true);
      $editable.trigger('edit-content-changed.edit');
    };
    if (!$field.hasClass('edit-type-direct-with-wysiwyg')) {
      // We cannot use Drupal.behaviors.formUpdated here because we're not dealing
      // with a form!
      $editable
      .bind('blur.edit keyup.edit paste.edit', function() {
        if ($editable.html() != $editable.data('edit-content-original')) {
          markContentChanged();
        }
      })
      // Disallow return/enter key when editing titles.
      .bind('keypress.edit', function(event) {
        if (event.keyCode == 13) {
          return false;
        }
      });
    }
    else {
      $editable.bind('edit-wysiwyg-content-changed.edit', function() {
        markContentChanged();
      });
    }
  },

  _restoreDirectEditable: function($editable) {
    if (Drupal.edit.findFieldForEditable($editable).hasClass('edit-type-direct-with-wysiwyg')
        && $editable.hasClass('edit-wysiwyg-attached'))
    {
      $editable.removeClass('edit-wysiwyg-attached');
      Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].detach($editable);

      // Work-around for major AE bug. See:
      //  - http://drupal.org/node/1725032
      //  - https://github.com/alohaeditor/Aloha-Editor/issues/693.
      // Also unbind to make sure this doesn't break anything when using
      // this version of edit.js with a fixed version of Aloha Editor.
      $editable
      .unbind('click.edit')
      .bind('click.edit', function() {
        Drupal.edit.editables.startEdit($(this)); return false;
      });
    }
    else {
      $editable
      .removeAttr('contenteditable')
      .unbind('keypress.edit');
    }

    Drupal.edit.editables._unpadEditable($editable);

    $editable
    .removeData(['edit-content-original', 'edit-content-changed', 'edit-content-original-transformed'])
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

  // Creates a form container; when the $editable is inline, it will inherit CSS
  // properties from the toolbar container, so the toolbar must already exist.
  _updateFormEditable: function($editable) {
    if (Drupal.edit.form.create($editable)) {
      $editable
      .addClass('edit-belowoverlay')
      .removeClass('edit-highlighted edit-editable');

      Drupal.edit.form.get($editable)
      .find('.edit-form')
      .addClass('edit-editable edit-highlighted edit-editing')
      .css('background-color', $editable.data('edit-background-color'));
    }
  },

  _restoreFormEditable: function($editable) {
    // No need to do anything here; all of the field HTML will be overwritten
    // with the freshly rendered version from the server anyway!
  },

  _loadForm: function($editable, $field) {
    var edit_id = Drupal.edit.getID($field);
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

      var wysiwyg = $field.hasClass('edit-type-direct-with-wysiwyg')
          && $editable.hasClass('edit-wysiwyg-attached');

      // When using WYSIWYG editing, first detach the WYSIWYG editor to ensure
      // the content has been cleaned up before saving it. (Otherwise,
      // annotations and infrastructure created by the WYSIWYG editor could also
      // get saved).
      if (wysiwyg) {
        $editable.removeClass('edit-wysiwyg-attached');
        Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].detach($editable);
      }

      // We trim the title because otherwise whitespace in the raw HTML ends
      // up in the title as well.
      // TRICKY: Drupal core does not trim the title, so in theory this is
      // out of line with Drupal core's behavior.
      var value = (wysiwyg)
        ? $.trim($editable.html())
        : $.trim($editable.text());
      $('#edit_backstage form')
      .find(':input[type!="hidden"][type!="submit"]').val(value).end()
      .find('.edit-form-submit').trigger('click.edit');
    }
    return false;
  },

  _buttonFieldCloseClicked: function(e, $editable, $field) {
    // Content not changed: stop editing field.
    if (!$editable.data('edit-content-changed')) {
      // Restore to original content. When dealing with processed text, it's
      // possible that one or more transformation filters are used. Then, the
      // "real" original content (i.e. the transformed one) is stored separately
      // from the "original content" that we use to detect changes.
      if (typeof $editable.data('edit-content-original-transformed') !== 'undefined') {
        $editable.html($editable.data('edit-content-original-transformed'));
      }

      Drupal.edit.editables.stopEdit($editable);
    }
    // Content changed: show modal.
    else {
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
