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
  var html = ''
  html += '<div id="edit-overlay" />';
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
  var html = ''
  html += '<div id="edit-backstage" />';
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
  var html = ''
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
  var html = ''
  html += '<div id="edit-modal">';
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
 *   - None.
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editToolbarContainer = function(settings) {
  var html = ''
  html += '<div class="edit-toolbar-container">';
  html += '  <div class="edit-toolbar primary" />';
  html += '  <div class="edit-toolbar secondary" />';
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
  var classes = 'edit-toolgroup edit-animate-fast edit-animate-invisible edit-animate-delay-veryfast';
  var html = ''
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
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editButtons = function(settings) {
  var html = ''
  for (var i in settings.buttons) {
    var button = settings.buttons[i];
    html += '<a href="' + button.url + '" class="' + button.classes + '">';
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
 *   - loadingMsg: The message to show while loading.
 * @return
 *   The corresponding HTML.
 */
Drupal.theme.prototype.editFormContainer = function(settings) {
  var html = ''
  html += '<div class="edit-form-container">';
  html += '  <div class="edit-form">';
  html += '    <div class="loading">';
  html +=        settings.loadingMsg;
  html += '    </div>';
  html += '  </div>';
  html += '</div>';
  return html;
};

})(jQuery);
