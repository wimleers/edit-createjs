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
      $(this).prevUntil(null, ':radio').trigger('click');
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

  // Transition between view/edit states.
  $("#ipe-view-edit-toggle input").click(function() {
    var wasViewing = Drupal.ipe.state.isViewing;
    var isViewing  = Drupal.ipe.state.isViewing = (this.value == "view");

    if (wasViewing && !isViewing) {
      $('<div id="ipe-overlay"></div>')
      .appendTo('body')
      .bind('click', Drupal.ipe.clickOverlay);;

      var $f = Drupal.ipe.findEditableFields();
      Drupal.ipe.startEditableFields($f);
      var $e = Drupal.ipe.findEditableEntities();
      Drupal.ipe.startEditableEntities($e);
    }
    else if (!wasViewing && isViewing) {
      $('#ipe-overlay, .ipe-toolbar-container').remove();
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

Drupal.ipe.findEditableEntities = function() {
  var $content = $('#content');
  return $('.node', $content);
};

Drupal.ipe.findEditableFields = function() {
  var $content = $('#content');
  var $f = $('.title, .field-item', $content).not('.comment-form');
  return $f;
};

Drupal.ipe.findEntityForField = function($f) {
  return $f.parents('.node');
};

Drupal.ipe.startEditableEntities = function($e) {
  $e
  .addClass('ipe-editable-candidate ipe-editable entity')
  .bind('mouseenter', function(e) {
    var $e = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('entity:mouseenter');
      Drupal.ipe.startHighlightEntity($e);
    });
  })
  .bind('mouseleave', function(e) {
    var $e = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('entity:mouseleave');
      Drupal.ipe.stopHighlightEntity($e);
    });
  });
};

Drupal.ipe.stopEditableEntities = function($e) {
  $e
  .removeClass('ipe-editable-candidate ipe-editable entity highlighted')
  .unbind('mouseenter')
  .unbind('mouseleave');
};

Drupal.ipe.startEditableFields = function($f) {
  $f
  .addClass('ipe-editable-candidate ipe-editable field')
  .bind('mouseenter', function(e) {
    var $f = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('field:mouseenter');
      if (!$f.hasClass('editing')) {
        Drupal.ipe.startHighlightField($f);
      }
      // Prevents the entity's mouse enter event from firing, in case their borders are one and the same.
      e.stopPropagation();
    });
  })
  .bind('mouseleave', function(e) {
    var $f = $(this);
    Drupal.ipe._ignoreToolbarMousing(e, function() {
      console.log('field:mouseleave');
      if (!$f.hasClass('editing')) {
        Drupal.ipe.stopHighlightField($f);
        // Leaving a field won't trigger the mouse enter event for the entity
        // because the entity contains the field. Hence, do it manually.
        var $e = Drupal.ipe.findEntityForField($f);
        Drupal.ipe.startHighlightEntity($e);
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });
  })
  .bind('click', function() { Drupal.ipe.startEditField($(this)); })
  // Some transformations are field-specific.
  .map(function() {
    // This does not get stripped when going back to view mode. The only way
    // this could possibly break, is when fields' background colors can change
    // on-the-fly, while a visitor is reading the page.
    $(this).css('background-color', Drupal.ipe._getBgColor($(this)));
  }); 
};

Drupal.ipe.stopEditableFields = function($f) {
  $f
  .removeClass('ipe-editable-candidate ipe-editable field highlighted editing')
  .unbind('mouseenter mouseleave click')
  .removeAttr('contenteditable');
};

Drupal.ipe.clickOverlay = function() {
  console.log('clicked overlay');
  Drupal.ipe.stopEditField(Drupal.ipe.state.fieldBeingEdited);
};

Drupal.ipe.createToolbar = function($element) {
  if (Drupal.ipe.getToolbar($element).length > 0) {
    return false;
  }
  else {
    $('<div class="ipe-toolbar-container"><div class="ipe-toolbar primary" /><div class="ipe-toolbar secondary" /></div>')
    .insertBefore($element)
    .bind('mouseenter', function(e) {
      // Prevent triggering the entity's mouse enter event.
      e.stopPropagation();
    })
    .bind('mouseleave', function(e) {
      var rt = (e.relatedTarget) ? e.relatedTarget : e.toElement;
      var el = $element[0];
      if (rt != el && !jQuery.contains(el, e.relatedTarget)) {
        console.log('triggering mouseleave on ', $element);
        $element.trigger('mouseleave');
      }
      // Prevent triggering the entity's mouse leave event.
      e.stopPropagation();
    });
    return true;
  }
};

Drupal.ipe.getToolbar = function($element) {
  return $element.prev('.ipe-toolbar-container');
};

Drupal.ipe.startHighlightEntity = function($e) {
  console.log('startHighlightEntity');
  if (Drupal.ipe.createToolbar($e)) {
    Drupal.ipe.getToolbar($e)
    .find('.ipe-toolbar.primary:not(:has(.ipe-toolgroup.entity))')
    .append('<div class="ipe-toolgroup entity"><a href="#" class="blue-button">Edit full node</a></div>');
  }
  $e.addClass('highlighted');

  Drupal.ipe.state.entityBeingHighlighted = $e;
};

Drupal.ipe.stopHighlightEntity = function($e) {
  console.log('stopHighlightEntity');
  $e.removeClass('highlighted');

  Drupal.ipe.getToolbar($e).remove();

  Drupal.ipe.state.entityBeingHiglighted = [];
};

Drupal.ipe.startHighlightField = function($f) {
  console.log('startHighlightField');
  if (Drupal.ipe.state.entityBeingHighlighted.length > 0) {
    var $e = Drupal.ipe.findEntityForField($f);
    Drupal.ipe.stopHighlightEntity($e);
  }
  if (Drupal.ipe.createToolbar($f)) {
    Drupal.ipe.getToolbar($f)
    .find('.ipe-toolbar.primary:not(:has(.ipe-toolgroup.info))')
    .append('<div class="ipe-toolgroup info"><a href="#" class="blank-button">Field name</a></div>');
  }
  $f.addClass('highlighted');

  Drupal.ipe.state.fieldBeingHighlighted = $f;
};

Drupal.ipe.stopHighlightField = function($f) {
  console.log('stopHighlightField');
  if ($f.length == 0) {
    return;
  }
  else if (Drupal.ipe.state.fieldBeingEdited.length > 0 && $f[0] == Drupal.ipe.state.fieldBeingEdited[0]) {
    return;
  }

  $f.removeClass('highlighted');

  Drupal.ipe.getToolbar($f).remove()
};

Drupal.ipe.startEditField = function($f) {
  if (Drupal.ipe.state.fieldBeingEdited.length > 0 && Drupal.ipe.state.fieldBeingEdited[0] == $f[0]) {
    return;
  }

  console.log('startEditField: ', $f);
  if (Drupal.ipe.state.fieldBeingHighlighted[0] != $f[0]) {
    Drupal.ipe.startHighlightField($f);
  }

  $f
  .data('ipe-content-original', $f.html())
  .addClass('editing')
  .attr('contenteditable', true)
  .bind('blur keyup paste', function() {
    if ($f.html() != $f.data('ipe-content-original')) {
      $f.trigger('ipe-content-changed');
      console.log('changed!');
    }
  })
  .bind('ipe-content-changed', function() {
    Drupal.ipe.getToolbar($f)
    .find('.save').addClass('blue-button').removeClass('gray-button');
  });

  // While editing, don't show *any* other field or entity as editable.
  $('.ipe-editable-candidate').not('.editing').removeClass('ipe-editable');

  Drupal.ipe.getToolbar($f)
  .find('.ipe-toolbar.secondary:not(:has(.ipe-toolgroup.ops))')
  .append('<div class="ipe-toolgroup ops"><a href="#" class="save gray-button">Save</a><a href="#" class="close gray-button"><span class="close"></span></a></div>')
  .find('.close').bind('click', function() {
    Drupal.ipe.stopEditField(Drupal.ipe.state.fieldBeingEdited);
    return false;
  });

  Drupal.ipe.state.fieldBeingEdited = $f;
};

Drupal.ipe.stopEditField = function($f) {
  console.log('stopEditField: ', $f);
  if ($f.length == 0) {
    return;
  }

  $f
  .removeClass('highlighted editing')
  .removeAttr('contenteditable');

  // Make the other fields and entities editable again.
  $('.ipe-editable-candidate').addClass('ipe-editable');

  Drupal.ipe.getToolbar($f).remove()

  Drupal.ipe.state.fieldBeingEdited = [];
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
  var rt;
  if (e.type == 'mouseleave') {
    rt = (e.relatedTarget) ? e.relatedTarget : e.toElement;
  }
  else if (e.type == 'mouseenter') {
    rt = (e.relatedTarget) ? e.relatedTarget : e.fromElement;
  }
  else {
    return;
  }

  if ($(rt).parents(".ipe-toolbar-container").length > 0) {
    e.stopPropagation();
    return;
  }
  else {
    callback();
  }
};

})(jQuery);

