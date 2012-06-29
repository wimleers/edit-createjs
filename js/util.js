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
  if (c == 'rgba(0, 0, 0, 0)') {
    // TODO: add edge case for Firefox' "transparent" here; this is a
    // browser bug: https://bugzilla.mozilla.org/show_bug.cgi?id=635724
    // TODO: test in all browsers
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

})(jQuery);
