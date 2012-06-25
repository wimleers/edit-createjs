(function($) {

/**
 * @file ui-editables.js
 *
 * UI components for editables: toolbar, form.
 */

Drupal.edit = Drupal.edit || {};


Drupal.edit.toolbar = {

  create: function($editable) {
    if (Drupal.edit.toolbar.get($editable).length > 0) {
      return false;
    }
    else {
      var $blockOfElement = Drupal.edit.util.getParentBlock($editable);
      $(Drupal.theme('editToolbarContainer', {}))
      .insertBefore($blockOfElement)
      .bind('mouseenter.edit', function(e) {
        // Prevent triggering the entity's mouse enter event.
        e.stopPropagation();
      })
      .bind('mouseleave.edit', function(e) {
        var el = $editable[0];
        if (e.relatedTarget != el && !jQuery.contains(el, e.relatedTarget)) {
          console.log('triggering mouseleave on ', $editable);
          $editable.trigger('mouseleave.edit');
        }
        // Prevent triggering the entity's mouse leave event.
        e.stopPropagation();
      });

      // Work-around for inline elements.
      if ($editable.css('display') == 'inline') {
        var pos = $editable.position();
        Drupal.edit.toolbar.get($editable)
        .css('left', pos.left).css('top', pos.top);
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
      var $field = Drupal.edit.findFieldForEditable($editable).filter('.edit-type-form');
      var $t2 = Drupal.edit.form.get($field).find('.edit-toolbar-container');
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

  create: function($editable) {
    if (Drupal.edit.form.get($editable).length > 0) {
      return false;
    }
    else {
      var $blockOfEditable = Drupal.edit.util.getParentBlock($editable);
      $(Drupal.theme('editFormContainer', { loadingMsg: Drupal.t('Loading…')}))
      .insertBefore($blockOfEditable);

      if ($editable.css('display') == 'inline') {
        var $toolbar = Drupal.edit.toolbar.get($editable);
        Drupal.edit.form.get($editable)
        .css('left', $toolbar.css('left'))
        .css('top', $toolbar.css('top'));
        $toolbar.css('left', '').css('top', '');
      }

      return true;
    }
  },

  get: function($editable) {
    var $blockOfEditable = Drupal.edit.util.getParentBlock($editable);
    return $blockOfEditable.prevAll('.edit-form-container');
  },

  remove: function($editable) {
    Drupal.edit.form.get($editable).remove();
  }

};

})(jQuery);
