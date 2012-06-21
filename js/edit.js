(function ($) {

Drupal.edit = Drupal.edit || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    $('#edit-view-edit-toggle').once('edit-init', Drupal.edit.init);
    $('#edit-view-edit-toggle').once('edit-toggle', Drupal.edit.renderToggle);

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

Drupal.edit.renderToggle = function() {
  // TODO: fancy, "physical toggle" to switch from view to edit mode and back.
};

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

Drupal.edit.calcFormURLForField = function(id) {
  var parts = id.split(':');
  var urlFormat = decodeURIComponent(Drupal.settings.edit.fieldFormURL);
  return Drupal.t(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2]
  });
};

Drupal.edit.findFieldForID = function(id, context) {
  return $('[data-edit-id="' + id + '"]', context || $('#content'));
};

Drupal.edit.findFieldForEditable = function($editable) {
  return $editable.filter('.edit-type-form').length ? $editable : $editable.closest('.edit-type-direct');
};

Drupal.edit.findEntityForField = function($f) {
  return $f.closest('.node');
};

Drupal.edit.startEditableEntities = function($e) {
  $e
  .once('edit')
  .addClass('edit-candidate edit-editable')
  .bind('mouseenter.edit', function(e) {
    var $e = $(this);
    Drupal.edit._ignoreToolbarMousing(e, function() {
      console.log('entity:mouseenter');
      Drupal.edit.startHighlightEntity($e);
    });
  })
  .bind('mouseleave.edit', function(e) {
    var $e = $(this);
    Drupal.edit._ignoreToolbarMousing(e, function() {
      console.log('entity:mouseleave');
      Drupal.edit.stopHighlightEntity($e);
    });
  });
};

Drupal.edit.stopEditableEntities = function($e) {
  $e
  .removeClass('edit-processed edit-candidate edit-editable edit-highlighted')
  .unbind('mouseenter.edit mouseleave.edit');
};

Drupal.edit.startEditableFields = function($fields) {
  var $fields = $fields.once('edit');
  var $editables = Drupal.edit.findEditablesForFields($fields);

  $editables
  .addClass('edit-candidate edit-editable')
  .bind('mouseenter.edit', function(e) {
    var $editable = $(this);
    Drupal.edit._ignoreToolbarMousing(e, function() {
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
    Drupal.edit._ignoreToolbarMousing(e, function() {
      console.log('field:mouseleave');
      if (!$editable.hasClass('edit-editing')) {
        Drupal.edit.stopHighlightField($editable);
        // Leaving a field won't trigger the mouse enter event for the entity
        // because the entity contains the field. Hence, do it manually.
        var $e = Drupal.edit.findEntityForField($editable);
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
    $(this).css('background-color', Drupal.edit._getBgColor($(this)));
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

  if (Drupal.edit.getModal().length == 0) {
    Drupal.edit.getToolbar(Drupal.edit.state.fieldBeingEdited)
    .find('a.close').trigger('click.edit');
  }
};

Drupal.edit.createToolbar = function($element) {
  if (Drupal.edit.getToolbar($element).length > 0) {
    return false;
  }
  else {
    var $blockOfElement = Drupal.edit._getParentBlock($element);
    $('<div class="edit-toolbar-container"><div class="edit-toolbar primary" /><div class="edit-toolbar secondary" /></div>')
    .insertBefore($blockOfElement)
    .bind('mouseenter.edit', function(e) {
      // Prevent triggering the entity's mouse enter event.
      e.stopPropagation();
    })
    .bind('mouseleave.edit', function(e) {
      var el = $element[0];
      if (e.relatedTarget != el && !jQuery.contains(el, e.relatedTarget)) {
        console.log('triggering mouseleave on ', $element);
        $element.trigger('mouseleave.edit');
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });

    // Work-around for inline elements.
    if ($element.css('display') == 'inline') {
      var pos = $element.position();
      Drupal.edit.getToolbar($element).css('left', pos.left).css('top', pos.top);
    }

    return true;
  }
};

Drupal.edit._getParentBlock = function($element) {
  var $block = $element;
  while ($block.css('display') == 'inline') {
    $block = $block.parent();
  }
  return $block;
};

Drupal.edit.getToolbar = function($editable) {
  if ($editable.length == 0) {
    return $([]);
  }
  // Default case.
  var $blockOfEditable = Drupal.edit._getParentBlock($editable);
  var $t = $blockOfEditable.prevAll('.edit-toolbar-container');
  // Currently editing a form, hence the toolbar is shifted around.
  if ($t.length == 0) {
    var $formFields = Drupal.edit.findFieldForEditable($editable).filter('.edit-type-form');
    var $t2 = Drupal.edit.getForm($formFields).find('.edit-toolbar-container');
    if ($t2.length > 0) {
      return $t2;
    }
  }
  return $t;
};

Drupal.edit.createForm = function($element) {
  if (Drupal.edit.getForm($element).length > 0) {
    return false;
  }
  else {
    var $blockOfElement = Drupal.edit._getParentBlock($element);
    $('<div class="edit-form-container"><div class="edit-form"><div class="loading">Loading...</div></div></div>')
    .insertBefore($blockOfElement);

    if ($element.css('display') == 'inline') {
      var $toolbar = Drupal.edit.getToolbar($element);
      Drupal.edit.getForm($element)
      .css('left', $toolbar.css('left'))
      .css('top', $toolbar.css('top'));
      $toolbar.css('left', '').css('top', '');
    }

    return true;
  }
};

Drupal.edit.getForm = function($element) {
  var $blockOfElement = Drupal.edit._getParentBlock($element);
  return $blockOfElement.prevAll('.edit-form-container');
};

Drupal.edit.createModal = function(message, $actions, $editable) {
  // The modal should be the only interaction element now.
  $editable.addClass('edit-belowoverlay');
  Drupal.edit.getToolbar($editable).addClass('edit-belowoverlay');

  $('<div id="edit-modal"><div class="main"><p></p></div><div class="actions"></div></div>')
  .appendTo('body')
  .find('.main p').text(message).end()
  .find('.actions').append($actions);
};

Drupal.edit.getModal = function() {
  return $('#edit-modal');
};

Drupal.edit.removeModal = function() {
  Drupal.edit.getModal().remove();

  // Make the other interaction elements available again.
  $('.edit-belowoverlay').removeClass('edit-belowoverlay');
};

Drupal.edit.startHighlightEntity = function($e) {
  console.log('startHighlightEntity');
  if (Drupal.edit.createToolbar($e)) {
    var label = Drupal.t('Edit !entity-label', { '!entity-label' : $e.data('edit-entity-label') });
    var url = $e.data('edit-entity-edit-url');
    Drupal.edit.getToolbar($e)
    .find('.edit-toolbar.primary:not(:has(.edit-toolgroup.entity))')
    .append('<div class="edit-toolgroup entity"><a href="' + url + '" class="blue-button">' + label + '</a></div>');
  }
  $e.addClass('edit-highlighted');

  Drupal.edit.state.entityBeingHighlighted = $e;
};

Drupal.edit.stopHighlightEntity = function($e) {
  console.log('stopHighlightEntity');
  $e.removeClass('edit-highlighted');

  Drupal.edit.getToolbar($e).remove();

  Drupal.edit.state.entityBeingHiglighted = [];
};

Drupal.edit.startHighlightField = function($editable) {
  console.log('startHighlightField');
  if (Drupal.edit.state.entityBeingHighlighted.length > 0) {
    var $e = Drupal.edit.findEntityForField($editable);
    Drupal.edit.stopHighlightEntity($e);
  }
  if (Drupal.edit.createToolbar($editable)) {
    var label = $editable.filter('.edit-type-form').data('edit-field-label') || $editable.closest('.edit-type-direct').data('edit-field-label');
    Drupal.edit.getToolbar($editable)
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

  Drupal.edit.getToolbar($editable).remove();

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
    Drupal.edit.getToolbar($editable)
    .find('a.save').addClass('blue-button').removeClass('gray-button');
  });

  // While editing, don't show *any* other field or entity as editable.
  $('.edit-candidate').not('.edit-editing').removeClass('edit-editable');

  // Toolbar + toolbar event handlers.
  Drupal.edit.getToolbar($editable)
  .find('.edit-toolbar.secondary:not(:has(.edit-toolgroup.ops))')
  .append('<div class="edit-toolgroup ops"><a href="#" class="save gray-button">Save</a><a href="#" class="close gray-button"><span class="close"></span></a></div>')
  .find('a.save').bind('click.edit', function() {
    // type = form
    if ($field.filter('.edit-type-form').length > 0) {
      Drupal.edit.getForm($field).find('form')
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
     Drupal.edit.createModal(Drupal.t('You have unsaved changes'), $actions, $editable);
  
     Drupal.edit.getModal()
     .find('a.discard').bind('click.edit', function() {
       // Restore to original state.
       $editable.html($editable.data('edit-content-original'));
       $editable.data('edit-content-changed', false);

       Drupal.edit.removeModal();
       Drupal.edit.getToolbar($editable).find('a.close').trigger('click.edit');
     }).end()
     .find('a.save').bind('click.edit', function() {
       Drupal.edit.removeModal();
       Drupal.edit.getToolbar($editable).find('a.save').trigger('click.edit');
     });
    }
    return false;
  });

  // If we're going to show a form, then prepare for it.
  if ($editable.hasClass('edit-type-form') && Drupal.edit.createForm($editable)) {
    $editable.addClass('edit-belowoverlay');

    Drupal.edit.getForm($editable)
    .find('.edit-form')
    .addClass('edit-editable edit-highlighted edit-editing')
    .css('background-color', Drupal.edit._getBgColor($editable))
    .end()
    .find('.loading')
    .attr('id', 'this-is-a-filthy-hack');
  }

  // Regardless of the type, load the form for this field. We always use forms to
  // submit the changes.
  var url = Drupal.edit.calcFormURLForField(edit_id);
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

  Drupal.edit.getToolbar($editable).remove();
  Drupal.edit.getForm($editable).remove();

  // Even for type=direct IPE, we use forms to send the changes to the server.
  if (Drupal.edit.findFieldForEditable($editable).hasClass('edit-type-direct')) {
    $('#edit-backstage form').remove();
  }

  Drupal.edit.state.fieldBeingEdited = [];
  Drupal.edit.state.editedEditable = null;
};

Drupal.edit._getBgColor = function($e) {
  var c;

  if ($e == null) {
    // Fallback to white.
    return 'white';
  }
  c = $e.css('background-color');
  if (c == 'rgba(0, 0, 0, 0)') {
    // TODO: add edge case for Firefox' "transparent" here; this is a
    // browser bug: https://bugzilla.mozilla.org/show_bug.cgi?id=635724
    // TODO: test in all browsers
    return Drupal.edit._getBgColor($e.parent());
  }
  return c;
};

Drupal.edit._ignoreToolbarMousing = function(e, callback) {
  if ($(e.relatedTarget).closest(".edit-toolbar-container").length > 0) {
    e.stopPropagation();
  }
  else {
    callback();
  }
};

$(function() {
  Drupal.ajax.prototype.commands.edit_field_form = function(ajax, response, status) {
    console.log('edit_field_form', ajax, response, status);

    // Only apply the form immediately if this form is currently being edited.
    if (Drupal.edit.state.editedEditable == response.id && ajax.$field.hasClass('edit-type-form')) {
      Drupal.ajax.prototype.commands.insert(ajax, {'data' : response.data});

      // Detect changes in this form.
      Drupal.edit.getForm(ajax.$editable)
      .find(':input').bind('formUpdated.edit', function() {
        ajax.$editable
        .data('edit-content-changed', true)
        .trigger('edit-content-changed.edit');
      });

      // Move  toolbar inside .edit-form-container, to let it snap to the width
      // of the form instead of the field formatter.
      Drupal.edit.getToolbar(ajax.$editable).detach().prependTo('.edit-form')

      var $submit = Drupal.edit.getForm(ajax.$editable).find('.edit-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.edit',
        progress : { type : 'throbber' },
        // IPE-specific settings.
        $editable : ajax.$editable,
        $field : ajax.$field
      };
      var base = $submit.attr('id');
      Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);

      // Give focus to the first input in the form.
      //$('.edit-form').find('form :input:visible:enabled:first').focus()
    }
    else if (Drupal.edit.state.editedEditable == response.id && ajax.$field.hasClass('edit-type-direct')) {
      Drupal.edit.state.directEditableFormResponse = response;
      $('#edit-backstage').append(response.data);

      var $submit = $('#edit-backstage form .edit-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.edit',
        progress : { type : 'throbber' },
        // IPE-specific settings.
        $editable : ajax.$editable,
        $field : ajax.$field
      };
      var base = $submit.attr('id');
      Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);
    }
    else {
      console.log('queueing', response);
    }
  };
  Drupal.ajax.prototype.commands.edit_field_form_saved = function(ajax, response, status) {
    console.log('edit_field_form_saved', ajax, response, status);

    // Stop the editing.
    Drupal.edit.stopEditField(ajax.$editable);

    // Response.data contains the updated rendering of the field, if any.
    if (response.data) {
      // Replace the old content with the new content.
      var $field = $('.edit-field[data-edit-id=' + response.id  + ']');
      var $parent = $field.parent();
      if ($field.css('display') == 'inline') {
        $parent.html(response.data);
      }
      else {
        $field.replaceWith(response.data);
      }

      // Make the freshly rendered field(s) in-place-editable again.
      Drupal.edit.startEditableFields(Drupal.edit.findEditableFields($parent));
    }
  };
});

})(jQuery);

