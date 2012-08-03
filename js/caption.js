(function($) {

Drupal.edit = Drupal.edit || {};
Drupal.edit.captionedImage = Drupal.edit.captionedImage || {};

Drupal.edit.captionedImage.render = function(variables, callback) {
  callback({
    content: Drupal.theme('captionedImage', variables),
    // Selector for image.
    image  : 'img',
    // Selector for caption.
    caption: '.caption-text'
  });
}

/**
 * Theme function for a captioned image.
 *
 * This is a JS version of caption.inc/theme_edit_captioned_image().
 */
Drupal.theme.prototype.captionedImage = function(variables) {
  var image   = variables.image,
      caption = variables.caption,
      align   = variables.align,
      width   = variables.width;
  return '<div class="caption caption-' + align + '">' +
         '<div class="caption-inner" style="width: ' + width + ';">' +
         image +
         '<div class="caption-text">' + caption + '</div>' +
         '</div></div>';
};

})(jQuery);
