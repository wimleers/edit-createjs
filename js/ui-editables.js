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

      // Remove any and all existing toolbars.
      $('.edit-toolbar-container').trigger('edit-toolbar-remove.edit');

      // Immediate removal whenever requested.
      // (This is necessary when showing many toolbars in rapid succession: we
      // don't want all of them to show up!)
      var $toolbar = this.get($editable);
      $toolbar
      .bind('edit-toolbar-remove.edit', function(e) {
        $toolbar.remove();
      });

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
      var $t2 = Drupal.edit.form.get($editable).find('.edit-toolbar-container');
      if ($t2.length > 0) {
        return $t2;
      }
    }
    return $t;
  },

  remove: function($editable) {
    var $toolbar = Drupal.edit.toolbar.get($editable);

    // Remove after animation.
    $toolbar
    .find('.edit-toolbar .edit-toolgroup')
    .addClass('edit-animate-invisible')
    .bind(Drupal.edit.const.transitionEnd, function(e) {
      $toolbar.remove();
    });
  },

  // Animate into view.
  show: function($editable, toolbar, toolgroup) {
    Drupal.edit.toolbar.get($editable)
    .find('.edit-toolbar.' + toolbar + ' .edit-toolgroup.' + toolgroup)
    .removeClass('edit-animate-invisible');
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

      // Move  toolbar inside .edit-form-container, to let it snap to the width
      // of the form instead of the field formatter.
      Drupal.edit.toolbar.get($editable).detach().prependTo('.edit-form')

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
