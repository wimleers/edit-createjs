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
      console.log('Drupal.edit.toolbar already instantiated/present for editable', Drupal.edit.toolbar.get($editable));
      return false;
    }
    else {
      // Render toolbar.
      var $toolbar = $(Drupal.theme('editToolbarContainer', {
        id: this._id($editable)
      }));

      // Insert in DOM.
      if ($editable.css('display') == 'inline') {
        $toolbar.prependTo($editable.offsetParent());

        var pos = $editable.position();
        Drupal.edit.toolbar.get($editable)
        .css('left', pos.left).css('top', pos.top);
      }
      else {
        $toolbar.insertBefore($editable);
      }

      // Animate the toolbar into visibility.
      setTimeout(function() {
        $toolbar.removeClass('edit-animate-invisible');
      }, 0);


      // Remove any and all existing toolbars, except for any that are for a
      // currently being edited field.
      $('.edit-toolbar-container:not(:has(.edit-editing))')
      .trigger('edit-toolbar-remove.edit');

      // Event bindings.
      $toolbar
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
      })
      // Immediate removal whenever requested.
      // (This is necessary when showing many toolbars in rapid succession: we
      // don't want all of them to show up!)
      .bind('edit-toolbar-remove.edit', function(e) {
        $toolbar.remove();
      })
      .delegate('.edit-toolbar, .edit-toolgroup', 'click.edit mousedown.edit', function(e) {
        if (!$(e.target).is(':input')) {
          return false;
        }
      })
      // Accomodate changed content in tertiary toolbar.
      .bind('edit-toolbar-tertiary-changed', function(e) {
        var $tertiary = $toolbar.find('.edit-toolbar.tertiary');
        var adjustedOffset = $tertiary.data('edit-adjusted-offset');
        if (typeof adjustedOffset === 'undefined') {
          $tertiary.data('edit-adjusted-offset', 0);
          adjustedOffset = 0;
        }

        var height = 0;
        $toolbar.find('.edit-toolbar.tertiary').children()
        .each(function(i, element) {
          height += $(element).height();
        });

        // If the height has changed, then change the offsets of the toolgroups
        // as well.
        if (height != adjustedOffset) {
          $toolbar.find('.edit-toolbar').each(function(i, element) {
            var top = $(element).css('top');
            $(element).css('top', parseFloat(top) - height + adjustedOffset + 'px');
          });
          $tertiary
            .css('height', height)
            .data('edit-adjusted-offset', height);
        }
      });

      return true;
    }
  },

  get: function($editable) {
    return ($editable.length == 0)
      ? $([])
      : $('#' + this._id($editable));
  },

  remove: function($editable) {
    var $toolbar = Drupal.edit.toolbar.get($editable);

    // Remove after animation.
    $toolbar
    .addClass('edit-animate-invisible')
    // Prevent this toolbar from being detected *while* it is being removed.
    .removeAttr('id')
    .find('.edit-toolbar .edit-toolgroup')
    .addClass('edit-animate-invisible')
    .bind(Drupal.edit.const.transitionEnd, function(e) {
      $toolbar.remove();
    });
  },

  // Animate into view.
  show: function($editable, toolgroup) {
    this._find($editable, toolgroup).removeClass('edit-animate-invisible');
  },

  addClass: function($editable, toolgroup, classes) {
    this._find($editable, toolgroup).addClass(classes);
  },

  removeClass: function($editable, toolgroup, classes) {
    this._find($editable, toolgroup).removeClass(classes);
  },

  _find: function($editable, toolgroup) {
    return Drupal.edit.toolbar.get($editable)
           .find('.edit-toolbar .edit-toolgroup.' + toolgroup);
  },

  _id: function($editable) {
    var edit_id = Drupal.edit.util.getID($editable);
    return 'edit-toolbar-for-' + edit_id.split(':').join('_');
  }
};


Drupal.edit.form = {
  create: function($editable, cb) {
    // @todo: refactor Drupal.edit.form into *two* separate objects/classes:
    // direct editables and form-based ones.

    var entity = Drupal.edit.vie.entities.get(Drupal.edit.util.getElementSubject($editable));
    var predicate = Drupal.edit.util.getElementPredicate($editable);
    var edit_id = entity.getSubjectUri() + ':' + predicate;
    var $field = Drupal.edit.util.findFieldForEditable($editable);

    // We only create a placeholder-div/form for the form-based instances.
    if ($field.hasClass('edit-type-form')) {
      // Check whether this form has already been loaded.
      if (Drupal.edit.form.get($editable).length > 0) {
        return false;
      }
      // Indicate in the 'info' toolgroup that the form is loading.
      Drupal.edit.toolbar.addClass($editable, 'primary', 'info', 'loading');

      // Render form container.
      var $form = $(Drupal.theme('editFormContainer', {
        id: this._id($editable),
        loadingMsg: Drupal.t('Loading…')}
      ));

      // Insert in DOM.
      if ($editable.css('display') == 'inline') {
        $form.prependTo($editable.offsetParent());

        var pos = $editable.position();
        $form.css('left', pos.left).css('top', pos.top);
        // Reset the toolbar's positioning because it'll be moved inside the
        // form container.
        Drupal.edit.toolbar.get($editable).css('left', '').css('top', '');
      }
      else {
        $form.insertBefore($editable);
      }

      // Move  toolbar inside .edit-form-container, to let it snap to the width
      // of the form instead of the field formatter.
      Drupal.edit.toolbar.get($editable).detach().prependTo('.edit-form');
    }

    var onLoadCallback = function(status, $form) {
      // @todo: re-factor
      if ($field.hasClass('edit-type-form')) {
        var formWrapperId = Drupal.edit.form._id($editable);
        // $form.wrap('<div>');
        $('#' + formWrapperId + ' .placeholder').replaceWith($form);

        // Indicate in the 'info' toolgroup that the form has loaded.
        Drupal.edit.toolbar.removeClass($editable, 'primary', 'info', 'loading');

        // Detect changes in this form.
        Drupal.edit.form.get($editable)
          .delegate(':input', 'formUpdated.edit', function () {
            $editable
              .data('edit-content-changed', true)
              .trigger('edit-content-changed.edit');
          })
          .delegate('input', 'keypress.edit', function (event) {
            if (event.keyCode == 13) {
              return false;
            }
          });
        var $submit = Drupal.edit.form.get($editable).find('.edit-form-submit');
      } else if ($field.hasClass('edit-type-direct')) {
        // Direct forms are stuffed into #edit_backstage, apparently.
        $('#edit_backstage').append($form);
        var $submit = $form.find('.edit-form-submit');
      }
      Drupal.edit.form._setupAjaxForm($editable, $field, $submit);

      // Animations.
      Drupal.edit.toolbar.show($editable, 'secondary', 'ops');
      $editable.trigger('edit-form-loaded.edit');

      // callback to be able to decorate / continue with the editable...
      cb($editable, $field);
    };

    this.loadForm(entity, predicate, onLoadCallback);
  },
  // @todo: complete refactoring.
  _setupAjaxForm: function($editable, $field, $submit) {
    // Re-wire the form to handle submit.
    var element_settings = {
      url: $submit.closest('form').attr('action'),
      setClick: true,
      event: 'click.edit',
      progress: {type:'throbber'},
      // IPE-specific settings.
      $editable: $editable,
      $field: $field,
      submit: { nocssjs : ($field.hasClass('edit-type-direct')) }
    };
    var base = $submit.attr('id');
    // Removing existing Drupal.ajax-thingy.
    if (Drupal.ajax.hasOwnProperty(base)) {
      delete Drupal.ajax[base];
      $editable.unbind('edit-internal.edit');
    }
    Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);
  },
  get: function($editable) {
    return ($editable.length == 0)
      ? $([])
      : $('#' + this._id($editable));
  },

  remove: function($editable) {
    console.log('Drupal.edit.form.remove', Drupal.edit.form.get($editable));
    Drupal.edit.form.get($editable).remove();
  },

  _id: function($editable) {
    var edit_id = Drupal.edit.util.getID($editable);
    return 'edit-form-for-' + edit_id.split(':').join('_');
  },

  /**
   * Loads a drupal form for a given vieEntity
   *
   * @todo: we need to use this for non-form-based FieldView-instances as well.
   * @todo: error handling etc.
   *
   * @param vieEntity object vieEntity
   * @param predicate string predicate ("field name")
   * @param callback callback callback once form is loaded callback(status, $form)
   */
  loadForm: function (vieEntity, predicate, callback) {
    var edit_id = vieEntity.getSubjectUri() + ':' + predicate;
    var $field = Drupal.edit.util.findFieldForID(edit_id);
    var $editable = Drupal.edit.util.findEditablesForFields($field);
    var element_settings = {
      url      : Drupal.edit.util.calcFormURLForField(edit_id),
      event    : 'edit-internal.edit',
      $field   : $field,
      $editable: $editable,
      submit   : { nocssjs : ($field.hasClass('edit-type-direct')) },
      progress : { type : null } // No progress indicator.
    };
    // Removing existing Drupal.ajax-thingy.
    if (Drupal.ajax.hasOwnProperty(edit_id)) {
      delete Drupal.ajax[edit_id];
      $editable.unbind('edit-internal.edit');
    }
    Drupal.ajax[edit_id] = new Drupal.ajax(edit_id, $editable, element_settings);
    // Some form of closure.
    Drupal.ajax[edit_id].commands.edit_field_form = function(ajax, response, status) {
      callback(status, $(response.data));
    }
    $editable.trigger('edit-internal.edit');
  },
  /**
   * Saves (trigger submit) a edit.module form that has been loaded via
   * Drupal.edit.form.loadForm method. Replaces the old editable with the
   * response.
   *
   * @todo: validation handling.
   *
   * @param vieEntity object vieEntity
   * @param predicate string  predicate ("field name")
   * @param $editable object  editable object
   * @param value object? form value - ignored in form-based
   * @param callback  callback after form has been submitted cb(error, $el);
   */
  saveForm: function (vieEntity, predicate, $editable, value, callback) {
    var edit_id = vieEntity.getSubjectUri() + ':' + predicate;
    var $field = Drupal.edit.util.findFieldForID(edit_id);
    // Handle form FormEditableFieldView
    if ($field.hasClass('edit-type-form')) {
      // Figure out the submit button for this form.
      var $submit = Drupal.edit.form.get($editable).find('.edit-form-submit');
      var base = $submit.attr('id');

      // handle the saveForm callback (edit_field_form_saved).
      var formEditableFormSubmittedCallback = function(ajax, response, status) {
        var edit_id = vieEntity.getSubjectUri() + ':' + predicate;
        // response.data contains the updated rendering of the field, if any.
        if (response.data) {
          // Stop the editing.
          var currentEditorView = Drupal.edit.state.get('editedFieldView');
          if (currentEditorView) {
            currentEditorView.disableEditor();
          }
          // this is different from edit.module. did not understand what the
          // stuff was about.
          $inner = $(response.data).html();
          $editable.html($inner);
        }
        // Remove this Drupal.ajax[base]?
        delete Drupal.ajax[base];
        callback(null, $editable);
      }
      // Setup of a closure to handle the response at last minute.
      Drupal.ajax[base].commands.edit_field_form_saved = formEditableFormSubmittedCallback;
      $submit.trigger('click.edit');
    } else {
      // EditableFieldView (direct or wysiwyg).

      var submitDirectForm = function(value) {
        var $submit = $('#edit_backstage form .edit-form-submit');
        var base = $submit.attr('id');

        // Shove the value into any field that isn't hidden or a submit button.
        $('#edit_backstage form').find(':input[type!="hidden"][type!="submit"]').val(value);
        console.log('submitDirectForm', $submit, base, $('#edit_backstage form'));
        // Set the callback.
        Drupal.ajax[base].commands.edit_field_form_saved = function(ajax, response, status) {
          // Direct forms are stuffed into #edit_backstage, apparently.
          // that's why Drupal.edit.form.remove($editable); doesn't work.
          $('#edit_backstage form').remove();
          // Removing Drupal.ajax-thingy.
          delete Drupal.ajax[base];
          // @todo: title currently returns success but no response.data.
          if (response.data) {
            // Stop the editing.
            var currentEditorView = Drupal.edit.state.get('editedFieldView');
            if (currentEditorView) {
              currentEditorView.disableEditor();
            }
            callback(null, $editable);
          } else {
            // @todo: handle errors, empty response?
            console.log('no response data', response, status);
            callback(true, $editable);
          }
        };
        $submit.trigger('click.edit');
      }

      // If form doesn't already exist, create it and then submit.
      if (!Drupal.edit.form.get($editable).length > 0) {
        Drupal.edit.form.create($editable, function($editable, $field) {
          // Submit the value.
          submitDirectForm(value);
        });
      } else {
        // Submit the value.
        submitDirectForm(value);
      }
    }
  }
};

})(jQuery);
