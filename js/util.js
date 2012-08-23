(function($) {

/**
 * @file util.js
 *
 * Utilities for Edit module.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.util = Drupal.edit.util || {};
Drupal.edit.util.views = {};

Drupal.edit.util.getID = function(element) {
  var id = jQuery(element).data('edit-id');
  if (!id) {
    id = jQuery(element).closest('[data-edit-id]').data('edit-id');
  }
  return id;
};

Drupal.edit.util.getElementSubject = function(element) {
  return Drupal.edit.util.getID(element).split(':').slice(0, 2).join(':');
};

Drupal.edit.util.getElementPredicate = function(element) {
  return Drupal.edit.util.getID(element).split(':').pop();
};

Drupal.edit.util.getElementEntity = function(element, vie) {
  return vie.entities.get(Drupal.edit.util.getElementSubject(element));
};

Drupal.edit.util.findEditableEntities = function(context) {
  var entityElements = $('.edit-entity.edit-allowed', context || Drupal.settings.edit.context);
  entityElements.each(function () {
    // Register the entity with VIE
    Drupal.edit.vie.entities.addOrUpdate({
      '@subject': Drupal.edit.util.getElementSubject(jQuery(this)),
      '@type': jQuery(this).data('edit-entity-label')
    }, {
      overrideAttributes: true
    });
  });
  return entityElements;
};

Drupal.edit.util.findEditableFields = function(context) {
  var propertyElements = $('.edit-field.edit-allowed', context || Drupal.settings.edit.context);
  propertyElements.each(function () {
    // Register with VIE
    var propertyName = Drupal.edit.util.getElementPredicate(jQuery(this));
    var entityData = {
      '@subject': Drupal.edit.util.getElementSubject(jQuery(this))
    };
    entityData[propertyName] = jQuery('.field-item', this).html();
    Drupal.edit.vie.entities.addOrUpdate(entityData, {
      overrideAttributes: true
    });
  });
  return propertyElements;
};

/*
 * findEditableFields() just looks for fields that are editable, i.e. for the
 * field *wrappers*. Depending on the field, however, either the whole field wrapper
 * will be marked as editable (in this case, an inline form will be used for editing),
 * *or* a specific (field-specific even!) DOM element within that field wrapper will be
 * marked as editable.
 * This function is for finding the *editables* themselves, given the *editable fields*.
 */
Drupal.edit.util.findEditablesForFields = function($fields) {
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

Drupal.edit.util.findFieldForID = function(id, context) {
  return $('[data-edit-id="' + id + '"]', context || $('#content'));
};

Drupal.edit.util.findFieldForEditable = function($editable) {
  return $editable.filter('.edit-type-form').length ? $editable : $editable.closest('.edit-type-direct');
};

Drupal.edit.util.findEntityForEditable = function($editable) {
  return Drupal.edit.util.findEntityForField(Drupal.edit.util.findFieldForEditable($editable));
};

Drupal.edit.util.findEntityForField = function($f) {
  var $e = $f.closest('.edit-entity');
  if ($e.length == 0) {
    var entity_edit_id = $f.data('edit-id').split(':').slice(0,2).join(':');
    $e = $('.edit-entity[data-edit-id="' + entity_edit_id + '"]');
  }
  return $e;
};

Drupal.edit.util.calcFormURLForField = function(id) {
  var parts = id.split(':');
  var urlFormat = decodeURIComponent(Drupal.settings.edit.fieldFormURL);
  return Drupal.t(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2]
  });
};

Drupal.edit.util.calcRerenderProcessedTextURL = function(id) {
  var parts = id.split(':');
  var urlFormat = decodeURIComponent(Drupal.settings.edit.rerenderProcessedTextURL);
  return Drupal.t(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2]
  });
}

/**
 * Get the background color of an element (or the inherited one).
 */
Drupal.edit.util.getBgColor = function($e) {
  var c;

  if ($e == null || $e[0].nodeName == 'HTML') {
    // Fallback to white.
    return 'rgb(255, 255, 255)';
  }
  c = $e.css('background-color');
  // TRICKY: edge case for Firefox' "transparent" here; this is a
  // browser bug: https://bugzilla.mozilla.org/show_bug.cgi?id=635724
  if (c == 'rgba(0, 0, 0, 0)' || c == 'transparent') {
    return Drupal.edit.util.getBgColor($e.parent());
  }
  return c;
};

/**
 * Ignore hovering to/from the given closest element, but as soon as a hover
 * occurs to/from *another* element, then call the given callback.
 */
Drupal.edit.util.ignoreHoveringVia = function(e, closest, callback) {
  if ($(e.relatedTarget).closest(closest).length > 0) {
    e.stopPropagation();
  }
  else {
    callback();
  }
};

/**
 * If no position properties defined, replace value with zero.
 */
Drupal.edit.util.replaceBlankPosition = function(pos) {
  if (pos == 'auto' || pos == NaN) {
    pos = '0px';
  }
  return pos;
};

/**
 * Get the top and left properties of an element and convert extraneous
 * values and information into numbers ready for subtraction.
 */
Drupal.edit.util.getPositionProperties = function($e) {
  var p,
      r = {},
      props = [
        'top', 'left',
        'padding-top', 'padding-left', 'padding-right', 'padding-bottom',
        'margin-bottom'
      ];

  for (var i = 0; i < props.length; i++) {
    p = props[i];
    r[p] = parseFloat(this.replaceBlankPosition($e.css(p)));
  }
  return r;
};

})(jQuery);
