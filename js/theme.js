(function($) {

/**
 * Theme function for the overlay of the Edit module.
 *
 * @param settings
 *   An object with the following keys:
 *   - None.
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editOverlay = function(settings) {
  var html = '';
  html += '<div id="edit_overlay" />';
  return html;
};

/**
 * Theme function for a "backstage" for the Edit module.
 *
 * @param settings
 *   An object with the following keys:
 *   - None.
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editBackstage = function(settings) {
  var html = '';
  html += '<div id="edit_backstage" />';
  return html;
};

/**
 * Theme function for a "curtain" for the Edit module.
 *
 * @param settings
 *   An object with the following keys:
 *   - None.
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editCurtain = function(settings) {
  var html = '';
  html += '<div class="edit-curtain" />';
  return html;
};
/**
 * Theme function for a modal of the Edit module.
 *
 * @param settings
 *   An object with the following keys:
 *   - None.
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editModal = function(settings) {
  var classes = 'edit-animate-slow edit-animate-invisible edit-animate-delay-veryfast';
  var html = '';
  html += '<div id="edit_modal" class="' + classes + '">';
  html += '  <div class="main"><p></p></div>';
  html += '  <div class="actions"></div>';
  html += '</div>';
  return html;
};

/**
 * Theme function for a toolbar container of the Edit module.
 *
 * @param settings
 *   An object with the following keys:
 *   - id: the id to apply to the toolbar container
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editToolbarContainer = function(settings) {
  var html = '';
  html += '<div id="' + settings.id + '" class="edit-toolbar-container edit-animate-invisible edit-animate-only-visibility">';
  html += '  <div class="edit-toolbar-heightfaker edit-animate-fast">';
  html += '    <div class="edit-toolbar primary" />';
  html += '  </div>';
  html += '</div>';
  return html;
};


/**
 * Theme function for a toolbar toolgroup of the Edit module.
 *
 * @param settings
 *   An object with the following keys:
 *   - classes: the class of the toolgroup
 *   - buttons: @see Drupal.theme.prototype.editButtons().
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editToolgroup = function(settings) {
  var classes = 'edit-toolgroup edit-animate-slow edit-animate-invisible edit-animate-delay-veryfast';
  var html = '';
  html += '<div class="' + classes + ' ' + settings.classes + '">';
  html += Drupal.theme('editButtons', { buttons: settings.buttons });
  html += '</div>';
  return html;
};

/**
 * Theme function for buttons of the Edit module.
 *
 * Can be used for the buttons both in the toolbar toolgroups and in the modal.
 *
 * @param settings
 *   An object with the following keys:
 *   - buttons: an array of objects with the following keys:
 *     - url: the URL the button should point to
 *     - classes: the classes of the button
 *     - label: the label of the button
 *     - hasButtonRole: whether this button should have its "role" attribute set
 *       to "button"
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editButtons = function(settings) {
  var html = '';
  for (var i = 0; i < settings.buttons.length; i++) {
    var button = settings.buttons[i];
    if (!button.hasOwnProperty('hasButtonRole')) {
      button.hasButtonRole = true;
    }

    html += '<a href="' + button.url + '" class="' + button.classes + '"';
    html += (button.hasButtonRole) ? 'role="button"' : '';
    html += '>';
    html +=    button.label;
    html += '</a>';
  }
  return html;
};

/**
 * Theme function for a form container of the Edit module.
 *
 * @param settings
 *   An object with the following keys:
 *   - id: the id to apply to the toolbar container
 *   - loadingMsg: The message to show while loading.
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editFormContainer = function(settings) {
  var html = '';
  html += '<div id="' + settings.id + '" class="edit-form-container">';
  html += '  <div class="edit-form">';
  html += '    <div class="placeholder">';
  html +=        settings.loadingMsg;
  html += '    </div>';
  html += '  </div>';
  html += '</div>';
  return html;
};

})(jQuery);
