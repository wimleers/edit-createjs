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
      // TODO: start editing entities
    }
    else if (!wasViewing && isViewing) {
      $('#ipe-overlay, .ipe-toolbar-container').remove();
      var $f = Drupal.ipe.findEditableFields();
      Drupal.ipe.stopEditableFields($f);
      var $e = Drupal.ipe.findEditableEntities();
      // TODO: stop editing entities
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
  return $('.node');
};

Drupal.ipe.findEditableFields = function() {
  var $content = $('#content');
  var $f = $('.title, .field-item', $content).not('.comment-form');
  return $f;
};

Drupal.ipe.startEditableFields = function($f) {
  $f
  .addClass('ipe-editable-candidate')
  .bind('click', Drupal.ipe.startEditField)
  // Some transformations are field-specific.
  .map(function() {
    // This does not get stripped when going back to view mode. The only way
    // this could possibly break, is when fields' background colors can change
    // on-the-fly, while a visitor is reading the page.
    $(this).css('background-color', Drupal.ipe._getBgColor($(this)));
  }); 
};

/**
 * Strips changes made by prepFields(), plus whatever editField() changed.
 */
Drupal.ipe.stopEditableFields = function($f) {
  $f
  .removeClass('ipe-editable-candidate editing')
  .unbind('click')
  .removeAttr('contenteditable');

  $('.ipe-toolbar-container').remove();
};

Drupal.ipe.clickOverlay = function() {
  Drupal.ipe.stopEditField(Drupal.ipe.state.fieldBeingEdited);
};

Drupal.ipe.createToolbar = function($element) {
  if ($element.prev('.ipe-toolbar-container').length > 0) {
    return;
  };
  $('<div class="ipe-toolbar-container"><div class="ipe-toolbar"><div class="ipe-toolgroup ops"><a href="#" class="save gray-button">Save</a><a href="#" class="close gray-button"><span class="close"></span></a></div></div></div>').insertBefore($element);
}

Drupal.ipe.startEditField = function() {
  if (Drupal.ipe.state.fieldBeingEdited.length > 0) {
    Drupal.ipe.stopEditField(Drupal.ipe.state.fieldBeingEdited);
  }
  $(this)
  .addClass('editing')
  .attr('contenteditable', true);

  Drupal.ipe.createToolbar($(this));

  Drupal.ipe.state.fieldBeingEdited = $(this);
};

Drupal.ipe.stopEditField = function($f) {
  $f
  .removeClass('editing')
  .removeAttr('contenteditable')
  // Remove IPE toolbar.
  .prev('.ipe-toolbar-container').remove();
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
}

})(jQuery);

