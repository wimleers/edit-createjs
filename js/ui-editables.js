(function($) {

/**
 * @file ui-editables.js
 *
 * UI components for editables: toolbar, form.
 */

Drupal.edit = Drupal.edit || {};


Drupal.edit.toolbar = {

  create: function($element) {
    if (Drupal.edit.toolbar.get($element).length > 0) {
      return false;
    }
    else {
      var $blockOfElement = Drupal.edit.util.getParentBlock($element);
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
        Drupal.edit.toolbar.get($element).css('left', pos.left).css('top', pos.top);
      }

      return true;
    }
  },

  get: function($editable) {
    if ($editable.length == 0) {
      return $([]);
    }
    // Default case.
    var $blockOfEditable = Drupal.edit.util.getParentBlock($editable);
    var $t = $blockOfEditable.prevAll('.edit-toolbar-container');
    // Currently editing a form, hence the toolbar is shifted around.
    if ($t.length == 0) {
      var $formFields = Drupal.edit.findFieldForEditable($editable).filter('.edit-type-form');
      var $t2 = Drupal.edit.form.get($formFields).find('.edit-toolbar-container');
      if ($t2.length > 0) {
        return $t2;
      }
    }
    return $t;
  },

  remove: function($editable) {
    Drupal.edit.toolbar.get($editable).remove();
  }

};


Drupal.edit.form = {

  create: function($element) {
    if (Drupal.edit.form.get($element).length > 0) {
      return false;
    }
    else {
      var $blockOfElement = Drupal.edit.util.getParentBlock($element);
      $('<div class="edit-form-container"><div class="edit-form"><div class="loading">Loading...</div></div></div>')
      .insertBefore($blockOfElement);

      if ($element.css('display') == 'inline') {
        var $toolbar = Drupal.edit.toolbar.get($element);
        Drupal.edit.form.get($element)
        .css('left', $toolbar.css('left'))
        .css('top', $toolbar.css('top'));
        $toolbar.css('left', '').css('top', '');
      }

      return true;
    }
  },

  get: function($element) {
    var $blockOfElement = Drupal.edit.util.getParentBlock($element);
    return $blockOfElement.prevAll('.edit-form-container');
  },

  remove: function($element) {
    Drupal.edit.form.get($element).remove();
  }

};


})(jQuery);
