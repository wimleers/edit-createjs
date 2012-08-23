(function($) {

/**
 * @file util.js
 *
 * Utilities for Edit module.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.util = Drupal.edit.util || {};

Drupal.edit.util.getID = function(element) {
  return jQuery(element).data('edit-id');
};

Drupal.edit.util.getElementSubject = function(element) {
  return Drupal.edit.util.getID(element).split(':').slice(0, 2).join(':');
};

Drupal.edit.util.getElementPredicate = function(element) {
  return Drupal.edit.util.getID(element).split(':').pop();
};

Drupal.edit.util.getElementEntity = function(element, vie) {
  return vie.entities.get(Drupal.edit.getElementSubject(element));
};

Drupal.edit.util.findEditableEntities = function(context) {
  var entityElements = $('.edit-entity.edit-allowed', context || Drupal.settings.edit.context);
  entityElements.each(function () {
    // Register the entity with VIE
    Drupal.edit.vie.entities.addOrUpdate({
      '@subject': Drupal.edit.util.getElementSubject(jQuery(this)),
      '@type': jQuery(this).data('edit-entity-label')
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
    Drupal.edit.vie.entities.addOrUpdate(entityData);
  });
  return propertyElements;
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
