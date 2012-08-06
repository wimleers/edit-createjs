(function($) {

/**
 * @file util.js
 *
 * Utilities for Edit module.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.util = Drupal.edit.util || {};

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
 * Strip extraneous information ("px") from a given value in preparation
 * for getPositionProperties().
 */
Drupal.edit.util.stripPX = function(value) {
  if (value) {
    var index = value.indexOf('px');
    if (index === -1) {
      return NaN;
    }
    else {
      return Number(value.substring(0, index));
    }
  }
  else {
    return NaN;
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
    r[p] = this.stripPX(this.replaceBlankPosition($e.css(p)));
  }
  return r;
};

})(jQuery);
