(function ($) {

Drupal.edit = Drupal.edit || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    $('#edit-view-edit-toggle').once('edit-init', Drupal.edit.init);
    $('#edit-view-edit-toggle').once('edit-toggle', Drupal.edit.toggle.render);

    // TODO: remove this; this is to make the current prototype somewhat usable.
    $('#edit-view-edit-toggle label').click(function() {
      $(this).prevUntil(null, ':radio').trigger('click.edit');
    });
  }
};

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

  // Build inventory.
  var IDMapper = function() { return Drupal.edit.getID($(this)); };
  Drupal.edit.state.entities = Drupal.edit.findEditableEntities().map(IDMapper);
  Drupal.edit.state.fields = Drupal.edit.findEditableFields().map(IDMapper);
  console.log('Entities:', Drupal.edit.state.entities.length, ';', Drupal.edit.state.entities);
  console.log('Fields:', Drupal.edit.state.fields.length, ';', Drupal.edit.state.fields);

  // Form preloader.
  Drupal.edit.state.queues.preload = Drupal.edit.findEditableFields().filter('.edit-type-form').map(IDMapper);
  console.log('Fields with (server-generated) forms:', Drupal.edit.state.queues.preload);

  // Create a backstage area.
  $('<div id="edit-backstage" />').appendTo('body');

  // Transition between view/edit states.
  $("#edit-view-edit-toggle input").click(function() {
    var wasViewing = Drupal.edit.state.isViewing;
    var isViewing  = Drupal.edit.state.isViewing = (this.value == "view");

    if (wasViewing && !isViewing) {
      $('<div id="edit-overlay"></div>')
      .appendTo('body')
      .bind('click.edit', Drupal.edit.clickOverlay);;

      var $f = Drupal.edit.findEditableFields();
      Drupal.edit.startEditableFields($f);
      var $e = Drupal.edit.findEditableEntities();
      Drupal.edit.startEditableEntities($e);

      // TODO: preload forms. We could do one request per form, but that's more
      // RTTs than needed. Instead, the server should support batch requests.
      console.log('Preloading forms that we might need!', Drupal.edit.state.queues.preload);
    }
    else if (!wasViewing && isViewing) {
      $('#edit-overlay, .edit-toolbar-container, #edit-modal').remove();
      var $f = Drupal.edit.findEditableFields();
      Drupal.edit.stopEditableFields($f);
      var $e = Drupal.edit.findEditableEntities();
      Drupal.edit.stopEditableEntities($e);
    }
    else {
      // No state change.
    }
  });
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

Drupal.edit.findEditableEntities = function(context) {
  return $('.edit-entity.edit-allowed', context || $('#content'));
};

Drupal.edit.findEditableFields = function(context) {
  return $('.edit-field.edit-allowed', context || $('#content'));
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
  var $e = $f.closest('.ipe-entity');
  if ($e.length == 0) {
    var entity_edit_id = $f.data('edit-id').split(':').slice(0,2).join(':');
    $e = $('.edit-entity[data-edit-id=' + entity_edit_id + ']');
  }
  return $e;
};

Drupal.edit.findEntityForEditable = function($editable) {
  return Drupal.edit.findEntityForField(Drupal.edit.findFieldForEditable($editable));
};

Drupal.edit.startEditableEntities = function($e) {
  $e
  .once('edit')
  .addClass('edit-candidate edit-editable')
  .bind('mouseenter.edit', function(e) {
    var $e = $(this);
    Drupal.edit.util.ignoreHoveringVia(e, '.edit-toolbar-container', function() {
      console.log('entity:mouseenter');
      Drupal.edit.startHighlightEntity($e);
    });
  })
  .bind('mouseleave.edit', function(e) {
    var $e = $(this);
    Drupal.edit.util.ignoreHoveringVia(e, '.edit-toolbar-container', function() {
      console.log('entity:mouseleave');
      Drupal.edit.stopHighlightEntity($e);
    });
  })
  // Hang a curtain over the comments if they're inside the entity.
  .find('.comment-wrapper').prepend('<div class="edit-curtain" />')
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
  var $editables = Drupal.edit.findEditablesForFields($fields);

  $editables
  .addClass('edit-candidate edit-editable')
  .bind('mouseenter.edit', function(e) {
    var $editable = $(this);
    Drupal.edit.util.ignoreHoveringVia(e, '.edit-toolbar-container', function() {
      console.log('field:mouseenter');
      if (!$editable.hasClass('edit-editing')) {
        Drupal.edit.startHighlightField($editable);
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
        Drupal.edit.stopHighlightField($editable);
        // Leaving a field won't trigger the mouse enter event for the entity
        // because the entity contains the field. Hence, do it manually.
        var $e = Drupal.edit.findEntityForEditable($editable);
        Drupal.edit.startHighlightEntity($e);
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });
  })
  .bind('click.edit', function() { Drupal.edit.startEditField($(this)); return false; })
  // Some transformations are field-specific.
  .map(function() {
    // This does not get stripped when going back to view mode. The only way
    // this could possibly break, is when fields' background colors can change
    // on-the-fly, while a visitor is reading the page.
    $(this).css('background-color', Drupal.edit.util.getBgColor($(this)));
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

Drupal.edit.startHighlightEntity = function($e) {
  console.log('startHighlightEntity');
  if (Drupal.edit.toolbar.create($e)) {
    var label = Drupal.t('Edit !entity-label', { '!entity-label' : $e.data('edit-entity-label') });
    var url = $e.data('edit-entity-edit-url');
    Drupal.edit.toolbar.get($e)
    .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.entity))')
    .append('<div class="edit-toolgroup entity"><a href="' + url + '" class="blue-button">' + label + '</a></div>');
  }
  $e.addClass('edit-highlighted');

  Drupal.edit.state.entityBeingHighlighted = $e;
};

Drupal.edit.stopHighlightEntity = function($e) {
  console.log('stopHighlightEntity');
  $e.removeClass('edit-highlighted');

  Drupal.edit.toolbar.remove($e);

  Drupal.edit.state.entityBeingHiglighted = [];
};

Drupal.edit.startHighlightField = function($editable) {
  console.log('startHighlightField');
  if (Drupal.edit.state.entityBeingHighlighted.length > 0) {
    var $e = Drupal.edit.findEntityForEditable($editable);
    Drupal.edit.stopHighlightEntity($e);
  }
  if (Drupal.edit.toolbar.create($editable)) {
    var label = $editable.filter('.edit-type-form').data('edit-field-label') || $editable.closest('.edit-type-direct').data('edit-field-label');
    Drupal.edit.toolbar.get($editable)
    .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.info))')
    .append('<div class="edit-toolgroup info"><a href="#" class="blank-button">' + label + ' </a></div>');
  }
  $editable.addClass('edit-highlighted');

  Drupal.edit.state.fieldBeingHighlighted = $editable;
  Drupal.edit.state.higlightedEditable = Drupal.edit.getID(Drupal.edit.findFieldForEditable($editable));
};

Drupal.edit.stopHighlightField = function($editable) {
  console.log('stopHighlightField');
  if ($editable.length == 0) {
    return;
  }
  else if (Drupal.edit.state.fieldBeingEdited.length > 0 && $editable[0] == Drupal.edit.state.fieldBeingEdited[0]) {
    return;
  }

  $editable.removeClass('edit-highlighted');

  Drupal.edit.toolbar.remove($editable);

  Drupal.edit.state.fieldBeingHighlighted = [];
  Drupal.edit.state.highlightedEditable = null;
};

Drupal.edit.startEditField = function($editable) {
  if (Drupal.edit.state.fieldBeingEdited.length > 0 && Drupal.edit.state.fieldBeingEdited[0] == $editable[0]) {
    return;
  }

  console.log('startEditField: ', $editable);
  if (Drupal.edit.state.fieldBeingHighlighted[0] != $editable[0]) {
    Drupal.edit.startHighlightField($editable);
  }

  var $field = Drupal.edit.findFieldForEditable($editable);
  var edit_id = Drupal.edit.getID($field);

  $editable
  .data('edit-content-original', $editable.html())
  .data('edit-content-changed', false)
  .addClass('edit-editing')
  .attr('contenteditable', true)
  // We cannot use Drupal.behaviors.formUpdated here because we're not dealing
  // with a form!
  .bind('blur.edit keyup.edit paste.edit', function() {
    if ($editable.html() != $editable.data('edit-content-original')) {
      $editable.data('edit-content-changed', true);
      $editable.trigger('edit-content-changed.edit');
      console.log('changed!');
    }
  })
  .bind('edit-content-changed.edit', function() {
    Drupal.edit.toolbar.get($editable)
    .find('a.save').addClass('blue-button').removeClass('gray-button');
  });

  // While editing, don't show *any* other field or entity as editable.
  $('.edit-candidate').not('.edit-editing').removeClass('edit-editable');
  Drupal.edit.findEntityForField($field).find('.comment-wrapper .edit-curtain').height(0);

  // Toolbar + toolbar event handlers.
  Drupal.edit.toolbar.get($editable)
  .find('.edit-toolbar.secondary:not(:has(.edit-toolgroup.ops))')
  .append('<div class="edit-toolgroup ops"><a href="#" class="save gray-button">Save</a><a href="#" class="close gray-button"><span class="close"></span></a></div>')
  .find('a.save').bind('click.edit', function() {
    // type = form
    if ($field.filter('.edit-type-form').length > 0) {
      Drupal.edit.form.get($field).find('form')
      .find('.edit-form-submit').trigger('click.edit').end();
      //.find(':input:not('.edit-form-submit').attr('disabled', true);
    }
    // type = direct
    else {
      // Pseudofields (title, author, authoring date).
      var parts = edit_id.split(':');
      if (parts[2] == 'title') {
        // We trim the title because otherwise whitespace in the raw HTML ends
        // up in the title as well.
        // TRICKY: Drupal core does not trim the title, so in theory this is
        // out of line with Drupal core's behavior.
        var title = $.trim($editable.text());
        $('#edit-backstage form')
        .find(':input:first').val(title).end()
        .find('.edit-form-submit').trigger('click.edit');
      }
      // Fields.
      else {
        console.log('TODO: save');
        Drupal.edit.stopEditField($editable);
      }
    }
    return false;
  }).end()
  .find('a.close').bind('click.edit', function() {
    // Content not changed: stop editing field.
    if (!$editable.data('edit-content-changed')) {
      Drupal.edit.stopEditField($editable);
    }
    // Content changed: show modal.
    else {
     var $actions = $('<a href="#" class="gray-button discard">Discard changes</a><a href="#" class="blue-button save">Save</a>');
     Drupal.edit.modal.create(Drupal.t('You have unsaved changes'), $actions, $editable);

     Drupal.edit.modal.get()
     .find('a.discard').bind('click.edit', function() {
       // Restore to original state.
       $editable.html($editable.data('edit-content-original'));
       $editable.data('edit-content-changed', false);

       Drupal.edit.modal.remove();
       Drupal.edit.toolbar.get($editable).find('a.close').trigger('click.edit');
     }).end()
     .find('a.save').bind('click.edit', function() {
       Drupal.edit.modal.remove();
       Drupal.edit.toolbar.get($editable).find('a.save').trigger('click.edit');
     });
    }
    return false;
  });

  // If we're going to show a form, then prepare for it.
  if ($editable.hasClass('edit-type-form') && Drupal.edit.form.create($editable)) {
    $editable.addClass('edit-belowoverlay');

    Drupal.edit.form.get($editable)
    .find('.edit-form')
    .addClass('edit-editable edit-highlighted edit-editing')
    .css('background-color', Drupal.edit.util.getBgColor($editable))
    .end()
    .find('.loading')
    .attr('id', 'this-is-a-filthy-hack');
  }

  // Regardless of the type, load the form for this field. We always use forms to
  // submit the changes.
  var url = Drupal.edit.util.calcFormURLForField(edit_id);
  var element_settings = {
    url: url,
    event: 'edit-internal.edit',
    $field : $field,
    $editable : $editable,
    progress: { type : null }, // No progress indicator.
    wrapper: 'this-is-a-filthy-hack'
  };
  if (Drupal.ajax.hasOwnProperty(edit_id)) {
    delete Drupal.ajax[edit_id];
    $editable.unbind('edit-internal.edit');
  }
  Drupal.ajax[edit_id] = new Drupal.ajax(edit_id, $editable, element_settings);
  $editable.trigger('edit-internal.edit');

  Drupal.edit.state.fieldBeingEdited = $editable;
  Drupal.edit.state.editedEditable = edit_id;
};

Drupal.edit.stopEditField = function($editable) {
  console.log('stopEditField: ', $editable);
  if ($editable.length == 0) {
    return;
  }

  $editable
  .removeClass('edit-highlighted edit-editing')
  .removeAttr('contenteditable')
  .unbind('blur.edit keyup.edit paste.edit edit-content-changed')
  .removeData(['edit-content-original', 'edit-content-changed']);

  // Make the other fields and entities editable again.
  $('.edit-candidate').addClass('edit-editable');
  var $curtain = Drupal.edit.findEntityForEditable($editable)
  .find('.comment-wrapper .edit-curtain');
  $curtain.height($curtain.data('edit-curtain-height'));

  Drupal.edit.toolbar.remove($editable);
  Drupal.edit.form.remove($editable);

  // Even for type=direct IPE, we use forms to send the changes to the server.
  if (Drupal.edit.findFieldForEditable($editable).hasClass('edit-type-direct')) {
    $('#edit-backstage form').remove();
  }

  Drupal.edit.state.fieldBeingEdited = [];
  Drupal.edit.state.editedEditable = null;
};

})(jQuery);
