(function ($) {

Drupal.ipe = Drupal.ipe || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.ipe = {
  attach: function(context) {
    $('#ipe-view-edit-toggle').once('ipe-init', Drupal.ipe.init);
    $('#ipe-view-edit-toggle').once('ipe-toggle', Drupal.ipe.renderToggle);

    // TODO: remove this; this is to make the current prototype somewhat usable.
    $('#ipe-view-edit-toggle label').click(function() {
      $(this).prevUntil(null, ':radio').trigger('click.ipe');
    });
  }
};

Drupal.ipe.init = function() {
  Drupal.ipe.state = {};
  // We always begin in view mode.
  Drupal.ipe.state.isViewing = true;
  Drupal.ipe.state.entityBeingHighlighted = [];
  Drupal.ipe.state.fieldBeingHighlighted = [];
  Drupal.ipe.state.fieldBeingEdited = [];
  Drupal.ipe.state.higlightedEditable = null;
  Drupal.ipe.state.editedEditable = null;
  Drupal.ipe.state.queues = {};

  // Build inventory.
  var IDMapper = function() { return Drupal.ipe.getID($(this)); };
  Drupal.ipe.state.entities = Drupal.ipe.findEditableEntities().map(IDMapper);
  Drupal.ipe.state.fields = Drupal.ipe.findEditableFields().map(IDMapper);
  console.log('Entities:', Drupal.ipe.state.entities.length, ';', Drupal.ipe.state.entities);
  console.log('Fields:', Drupal.ipe.state.fields.length, ';', Drupal.ipe.state.fields);

  // Form preloader.
  Drupal.ipe.state.queues.preload = Drupal.ipe.findEditableFields().filter('.ipe-type-form').map(IDMapper);
  console.log('Fields with (server-generated) forms:', Drupal.ipe.state.queues.preload);

  // Create a backstage area.
  $('<div id="ipe-backstage" />').appendTo('body');

  // Transition between view/edit states.
  $("#ipe-view-edit-toggle input").click(function() {
    var wasViewing = Drupal.ipe.state.isViewing;
    var isViewing  = Drupal.ipe.state.isViewing = (this.value == "view");

    if (wasViewing && !isViewing) {
      $('<div id="ipe-overlay"></div>')
      .appendTo('body')
      .bind('click.ipe', Drupal.ipe.clickOverlay);;

      var $f = Drupal.ipe.findEditableFields();
      Drupal.ipe.startEditableFields($f);
      var $e = Drupal.ipe.findEditableEntities();
      Drupal.ipe.startEditableEntities($e);

      // TODO: preload forms. We could do one request per form, but that's more
      // RTTs than needed. Instead, the server should support batch requests.
      console.log('Preloading forms that we might need!', Drupal.ipe.state.queues.preload);
    }
    else if (!wasViewing && isViewing) {
      $('#ipe-overlay, .ipe-toolbar-container, #ipe-modal').remove();
      var $f = Drupal.ipe.findEditableFields();
      Drupal.ipe.stopEditableFields($f);
      var $e = Drupal.ipe.findEditableEntities();
      Drupal.ipe.stopEditableEntities($e);
    }
    else {
      // No state change.
    }
  });
};

Drupal.ipe.renderToggle = function() {
  // TODO: fancy, "physical toggle" to switch from view to edit mode and back.
};

Drupal.ipe.findEditableEntities = function(context) {
  return $('.ipe-entity.ipe-allowed', context || $('#content'));
};

Drupal.ipe.findEditableFields = function(context) {
  return $('.ipe-field.ipe-allowed', context || $('#content'));
};

/*
 * findEditableFields() just looks for fields that are editable, i.e. for the
 * field *wrappers*. Depending on the field, however, either the whole field wrapper
 * will be marked as editable (in this case, an inline form will be used for editing),
 * *or* a specific (field-specific even!) DOM element within that field wrapper will be
 * marked as editable.
 * This function is for finding the *editables* themselves, given the *editable fields*.
 */
Drupal.ipe.findEditablesForFields = function($fields) {
  var $editables = $();

  // type = form
  $editables = $editables.add($fields.filter('.ipe-type-form'));

  // type = direct
  var $direct = $fields.filter('.ipe-type-direct');
  $editables = $editables.add($direct.find('.field-item'));
  // Edge case: "title" pseudofield on pages with lists of nodes.
  $editables = $editables.add($direct.filter('h2').find('a'));
  // Edge case: "title" pseudofield on node pages.
  $editables = $editables.add($direct.find('h1'));

  return $editables;
};

Drupal.ipe.getID = function($field) {
  return $field.data('ipe-id');
};

Drupal.ipe.calcFormURLForField = function(id) {
  var parts = id.split(':');
  var urlFormat = decodeURIComponent(Drupal.settings.ipe.fieldFormURL);
  return Drupal.t(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2]
  });
};

Drupal.ipe.findFieldForID = function(id, context) {
  return $('[data-ipe-id="' + id + '"]', context || $('#content'));
};

Drupal.ipe.findFieldForEditable = function($editable) {
  return $editable.filter('.ipe-type-form').length ? $editable : $editable.closest('.ipe-type-direct');
};

Drupal.ipe.findEntityForField = function($f) {
  return $f.closest('.node');
};

Drupal.ipe.startEditableEntities = function($e) {
  $e
  .once('ipe')
  .addClass('ipe-candidate ipe-editable')
  .bind('mouseenter.ipe', function(e) {
    var $e = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('entity:mouseenter');
      Drupal.ipe.startHighlightEntity($e);
    });
  })
  .bind('mouseleave.ipe', function(e) {
    var $e = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('entity:mouseleave');
      Drupal.ipe.stopHighlightEntity($e);
    });
  });
};

Drupal.ipe.stopEditableEntities = function($e) {
  $e
  .removeClass('ipe-processed ipe-candidate ipe-editable ipe-highlighted')
  .unbind('mouseenter.ipe mouseleave.ipe');
};

Drupal.ipe.startEditableFields = function($fields) {
  var $fields = $fields.once('ipe');
  var $editables = Drupal.ipe.findEditablesForFields($fields);

  $editables
  .addClass('ipe-candidate ipe-editable')
  .bind('mouseenter.ipe', function(e) {
    var $editable = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('field:mouseenter');
      if (!$editable.hasClass('ipe-editing')) {
        Drupal.ipe.startHighlightField($editable);
      }
      // Prevents the entity's mouse enter event from firing, in case their borders are one and the same.
      e.stopPropagation();
    });
  })
  .bind('mouseleave.ipe', function(e) {
    var $editable = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('field:mouseleave');
      if (!$editable.hasClass('ipe-editing')) {
        Drupal.ipe.stopHighlightField($editable);
        // Leaving a field won't trigger the mouse enter event for the entity
        // because the entity contains the field. Hence, do it manually.
        var $e = Drupal.ipe.findEntityForField($editable);
        Drupal.ipe.startHighlightEntity($e);
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });
  })
  .bind('click.ipe', function() { Drupal.ipe.startEditField($(this)); return false; })
  // Some transformations are field-specific.
  .map(function() {
    // This does not get stripped when going back to view mode. The only way
    // this could possibly break, is when fields' background colors can change
    // on-the-fly, while a visitor is reading the page.
    $(this).css('background-color', Drupal.ipe._getBgColor($(this)));
  }); 
};

Drupal.ipe.stopEditableFields = function($fields) {
  var $editables = Drupal.ipe.findEditablesForFields($fields);

  $fields
  .removeClass('ipe-processed');

  $editables
  .removeClass('ipe-candidate ipe-editable ipe-highlighted ipe-editing ipe-belowoverlay')
  .unbind('mouseenter.ipe mouseleave.ipe click.ipe ipe-content-changed.ipe')
  .removeAttr('contenteditable')
  .removeData(['ipe-content-original', 'ipe-content-changed']);
};

Drupal.ipe.clickOverlay = function(e) {
  console.log('clicked overlay');

  if (Drupal.ipe.getModal().length == 0) {
    Drupal.ipe.getToolbar(Drupal.ipe.state.fieldBeingEdited)
    .find('a.close').trigger('click.ipe');
  }
};

Drupal.ipe.createToolbar = function($element) {
  if (Drupal.ipe.getToolbar($element).length > 0) {
    return false;
  }
  else {
    var $blockOfElement = Drupal.ipe._getParentBlock($element);
    $('<div class="ipe-toolbar-container"><div class="ipe-toolbar primary" /><div class="ipe-toolbar secondary" /></div>')
    .insertBefore($blockOfElement)
    .bind('mouseenter.ipe', function(e) {
      // Prevent triggering the entity's mouse enter event.
      e.stopPropagation();
    })
    .bind('mouseleave.ipe', function(e) {
      var el = $element[0];
      if (e.relatedTarget != el && !jQuery.contains(el, e.relatedTarget)) {
        console.log('triggering mouseleave on ', $element);
        $element.trigger('mouseleave.ipe');
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });

    // Work-around for inline elements.
    if ($element.css('display') == 'inline') {
      var pos = $element.position();
      Drupal.ipe.getToolbar($element).css('left', pos.left).css('top', pos.top);
    }

    return true;
  }
};

Drupal.ipe._getParentBlock = function($element) {
  var $block = $element;
  while ($block.css('display') == 'inline') {
    $block = $block.parent();
  }
  return $block;
};

Drupal.ipe.getToolbar = function($editable) {
  // Default case.
  var $blockOfEditable = Drupal.ipe._getParentBlock($editable);
  var $t = $blockOfEditable.prevAll('.ipe-toolbar-container');
  // Currently editing a form, hence the toolbar is shifted around.
  if ($t.length == 0) {
    var $formFields = Drupal.ipe.findFieldForEditable($editable).filter('.ipe-type-form');
    var $t2 = Drupal.ipe.getForm($formFields).find('.ipe-toolbar-container');
    if ($t2.length > 0) {
      return $t2;
    }
  }
  return $t;
};

Drupal.ipe.createForm = function($element) {
  if (Drupal.ipe.getForm($element).length > 0) {
    return false;
  }
  else {
    var $blockOfElement = Drupal.ipe._getParentBlock($element);
    $('<div class="ipe-form-container"><div class="ipe-form"><div class="loading">Loading...</div></div></div>')
    .insertBefore($blockOfElement);

    if ($element.css('display') == 'inline') {
      var $toolbar = Drupal.ipe.getToolbar($element);
      Drupal.ipe.getForm($element)
      .css('left', $toolbar.css('left'))
      .css('top', $toolbar.css('top'));
      $toolbar.css('left', '').css('top', '');
    }

    return true;
  }
};

Drupal.ipe.getForm = function($element) {
  var $blockOfElement = Drupal.ipe._getParentBlock($element);
  return $blockOfElement.prevAll('.ipe-form-container');
};

Drupal.ipe.createModal = function(message, $actions, $editable) {
  // The modal should be the only interaction element now.
  $editable.addClass('ipe-belowoverlay');
  Drupal.ipe.getToolbar($editable).addClass('ipe-belowoverlay');

  $('<div id="ipe-modal"><div class="main"><p></p></div><div class="actions"></div></div>')
  .appendTo('body')
  .find('.main p').text(message).end()
  .find('.actions').append($actions);
};

Drupal.ipe.getModal = function() {
  return $('#ipe-modal');
};

Drupal.ipe.removeModal = function() {
  Drupal.ipe.getModal().remove();

  // Make the other interaction elements available again.
  $('.ipe-belowoverlay').removeClass('ipe-belowoverlay');
};

Drupal.ipe.startHighlightEntity = function($e) {
  console.log('startHighlightEntity');
  if (Drupal.ipe.createToolbar($e)) {
    var label = Drupal.t('Edit !entity-label', { '!entity-label' : $e.data('ipe-entity-label') });
    var url = $e.data('ipe-entity-edit-url');
    Drupal.ipe.getToolbar($e)
    .find('.ipe-toolbar.primary:not(:has(.ipe-toolgroup.entity))')
    .append('<div class="ipe-toolgroup entity"><a href="' + url + '" class="blue-button">' + label + '</a></div>');
  }
  $e.addClass('ipe-highlighted');

  Drupal.ipe.state.entityBeingHighlighted = $e;
};

Drupal.ipe.stopHighlightEntity = function($e) {
  console.log('stopHighlightEntity');
  $e.removeClass('ipe-highlighted');

  Drupal.ipe.getToolbar($e).remove();

  Drupal.ipe.state.entityBeingHiglighted = [];
};

Drupal.ipe.startHighlightField = function($editable) {
  console.log('startHighlightField');
  if (Drupal.ipe.state.entityBeingHighlighted.length > 0) {
    var $e = Drupal.ipe.findEntityForField($editable);
    Drupal.ipe.stopHighlightEntity($e);
  }
  if (Drupal.ipe.createToolbar($editable)) {
    var label = $editable.filter('.ipe-type-form').data('ipe-field-label') || $editable.closest('.ipe-type-direct').data('ipe-field-label');
    Drupal.ipe.getToolbar($editable)
    .find('.ipe-toolbar.primary:not(:has(.ipe-toolgroup.info))')
    .append('<div class="ipe-toolgroup info"><a href="#" class="blank-button">' + label + ' </a></div>');
  }
  $editable.addClass('ipe-highlighted');

  Drupal.ipe.state.fieldBeingHighlighted = $editable;
  Drupal.ipe.state.higlightedEditable = Drupal.ipe.getID(Drupal.ipe.findFieldForEditable($editable));
};

Drupal.ipe.stopHighlightField = function($editable) {
  console.log('stopHighlightField');
  if ($editable.length == 0) {
    return;
  }
  else if (Drupal.ipe.state.fieldBeingEdited.length > 0 && $editable[0] == Drupal.ipe.state.fieldBeingEdited[0]) {
    return;
  }

  $editable.removeClass('ipe-highlighted');

  Drupal.ipe.getToolbar($editable).remove();

  Drupal.ipe.state.fieldBeingHighlighted = [];
  Drupal.ipe.state.highlightedEditable = null;
};

Drupal.ipe.startEditField = function($editable) {
  if (Drupal.ipe.state.fieldBeingEdited.length > 0 && Drupal.ipe.state.fieldBeingEdited[0] == $editable[0]) {
    return;
  }

  console.log('startEditField: ', $editable);
  if (Drupal.ipe.state.fieldBeingHighlighted[0] != $editable[0]) {
    Drupal.ipe.startHighlightField($editable);
  }

  var $field = Drupal.ipe.findFieldForEditable($editable);
  var ipe_id = Drupal.ipe.getID($field);

  $editable
  .data('ipe-content-original', $editable.html())
  .data('ipe-content-changed', false)
  .addClass('ipe-editing')
  .attr('contenteditable', true)
  // We cannot use Drupal.behaviors.formUpdated here because we're not dealing
  // with a form!
  .bind('blur.ipe keyup.ipe paste.ipe', function() {
    if ($editable.html() != $editable.data('ipe-content-original')) {
      $editable.data('ipe-content-changed', true);
      $editable.trigger('ipe-content-changed.ipe');
      console.log('changed!');
    }
  })
  .bind('ipe-content-changed.ipe', function() {
    Drupal.ipe.getToolbar($editable)
    .find('a.save').addClass('blue-button').removeClass('gray-button');
  });

  // While editing, don't show *any* other field or entity as editable.
  $('.ipe-candidate').not('.ipe-editing').removeClass('ipe-editable');

  // Toolbar + toolbar event handlers.
  Drupal.ipe.getToolbar($editable)
  .find('.ipe-toolbar.secondary:not(:has(.ipe-toolgroup.ops))')
  .append('<div class="ipe-toolgroup ops"><a href="#" class="save gray-button">Save</a><a href="#" class="close gray-button"><span class="close"></span></a></div>')
  .find('a.save').bind('click.ipe', function() {
    // type = form
    if ($field.filter('.ipe-type-form').length > 0) {
      Drupal.ipe.getForm($field).find('form')
      .find('.ipe-form-submit').trigger('click.ipe').end();
      //.find('input, select, textarea').attr('disabled', true);
    }
    // type = direct
    else {
      // Pseudofields (title, author, authoring date).
      var parts = ipe_id.split(':');
      if (parts[2] == 'title') {
        $('#ipe-backstage form')
        .find(':input:visible:first').val($editable.text()).end()
        .find(':input[type=submit]').trigger('click.ipe');
      }
      // Fields.
      else {
        console.log('TODO: save');
        Drupal.ipe.stopEditField($editable);
      }
    }
    return false;
  }).end()
  .find('a.close').bind('click.ipe', function() {
    // Content not changed: stop editing field.
    if (!$editable.data('ipe-content-changed')) {
      Drupal.ipe.stopEditField($editable);
    }
    // Content changed: show modal.
    else {
     var $actions = $('<a href="#" class="gray-button discard">Discard changes</a><a href="#" class="blue-button save">Save</a>');
     Drupal.ipe.createModal(Drupal.t('You have unsaved changes'), $actions, $editable);
  
     Drupal.ipe.getModal()
     .find('a.discard').bind('click.ipe', function() {
       // Restore to original state.
       $editable.html($editable.data('ipe-content-original'));
       $editable.data('ipe-content-changed', false);

       Drupal.ipe.removeModal();
       Drupal.ipe.getToolbar($editable).find('a.close').trigger('click.ipe');
     }).end()
     .find('a.save').bind('click.ipe', function() {
       Drupal.ipe.removeModal();
       Drupal.ipe.getToolbar($editable).find('a.save').trigger('click.ipe');
     });
    }
    return false;
  });

  // If we're going to show a form, then prepare for it.
  if ($editable.hasClass('ipe-type-form') && Drupal.ipe.createForm($editable)) {
    $editable.addClass('ipe-belowoverlay');

    Drupal.ipe.getForm($editable)
    .find('.ipe-form')
    .addClass('ipe-editable ipe-highlighted ipe-editing')
    .css('background-color', Drupal.ipe._getBgColor($editable))
    .end()
    .find('.loading')
    .attr('id', 'this-is-a-filthy-hack');
  }

  // Regardless of the type, load the form for this field. We always use forms to
  // submit the changes.
  var url = Drupal.ipe.calcFormURLForField(ipe_id);
  var element_settings = {
    url: url,
    event: 'ipe-internal.ipe',
    $field : $field,
    $editable : $editable,
    wrapper: 'this-is-a-filthy-hack'
  };
  if (Drupal.ajax.hasOwnProperty(ipe_id)) {
    delete Drupal.ajax[ipe_id];
    $editable.unbind('ipe-internal.ipe');
  }
  Drupal.ajax[ipe_id] = new Drupal.ajax(ipe_id, $editable, element_settings);
  $editable.trigger('ipe-internal.ipe');

  Drupal.ipe.state.fieldBeingEdited = $editable;
  Drupal.ipe.state.editedEditable = ipe_id;
};


Drupal.ipe.stopEditField = function($editable) {
  console.log('stopEditField: ', $editable);
  if ($editable.length == 0) {
    return;
  }

  $editable
  .removeClass('ipe-highlighted ipe-editing')
  .removeAttr('contenteditable')
  .unbind('blur.ipe keyup.ipe paste.ipe ipe-content-changed')
  .removeData(['ipe-content-original', 'ipe-content-changed']);

  // Make the other fields and entities editable again.
  $('.ipe-candidate').addClass('ipe-editable');

  Drupal.ipe.getToolbar($editable).remove();
  Drupal.ipe.getForm($editable).remove();

  // Even for type=direct IPE, we use forms to send the changes to the server.
  if (Drupal.ipe.findFieldForEditable($editable).hasClass('ipe-type-direct')) {
    $('#ipe-backstage form').remove();
  }

  Drupal.ipe.state.fieldBeingEdited = [];
  Drupal.ipe.state.editedEditable = null;
};

Drupal.ipe._getBgColor = function($e) {
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
    return Drupal.ipe._getBgColor($e.parent());
  }
  return c;
};

Drupal.ipe._ignoreToolbarMousing = function(e, callback) {
  if ($(e.relatedTarget).closest(".ipe-toolbar-container").length > 0) {
    e.stopPropagation();
  }
  else {
    callback();
  }
};

$(function() {
  Drupal.ajax.prototype.commands.ipe_field_form = function(ajax, response, status) {
    console.log('ipe_field_form', ajax, response, status);

    // Only apply the form immediately if this form is currently being edited.
    if (Drupal.ipe.state.editedEditable == response.id && ajax.$field.hasClass('ipe-type-form')) {
      Drupal.ajax.prototype.commands.insert(ajax, {'data' : response.data});

      // Detect changes in this form.
      Drupal.ipe.getForm(ajax.$editable)
      .find(':input').bind('formUpdated.ipe', function() {
        ajax.$editable
        .data('ipe-content-changed', true)
        .trigger('ipe-content-changed.ipe');
      });

      // Move  toolbar inside .ipe-form-container, to let it snap to the width
      // of the form instead of the field formatter.
      Drupal.ipe.getToolbar(ajax.$editable).detach().prependTo('.ipe-form')

      var $submit = Drupal.ipe.getForm(ajax.$editable).find('.ipe-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.ipe',
        progress : { type : 'throbber' },
        // IPE-specific settings.
        $editable : ajax.$editable,
        $field : ajax.$field
      };
      var base = $submit.attr('id');
      Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);

      // Give focus to the first input in the form.
      //$('.ipe-form').find('form :input:visible:enabled:first').focus()
    }
    else if (Drupal.ipe.state.editedEditable == response.id && ajax.$field.hasClass('ipe-type-direct')) {
      Drupal.ipe.state.directEditableFormResponse = response;
      $('#ipe-backstage').append(response.data);

      var $submit = $('#ipe-backstage form .ipe-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.ipe',
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
  Drupal.ajax.prototype.commands.ipe_field_form_saved = function(ajax, response, status) {
    console.log('ipe_field_form_saved', ajax, response, status);

    // Stop the editing.
    Drupal.ipe.stopEditField(ajax.$editable);

    // Response.data contains the updated rendering of the field, if any.
    if (response.data) {
      // Replace the old content with the new content.
      var $field = $('.ipe-field[data-ipe-id=' + response.id  + ']');
      var $parent = $field.parent();
      if ($field.css('display') == 'inline') {
        $parent.html(response.data);
      }
      else {
        $field.replaceWith(response.data);
      }

      // Make the freshly rendered field(s) in-place-editable again.
      Drupal.ipe.startEditableFields(Drupal.ipe.findEditableFields($parent));
    }
  };
});

})(jQuery);

