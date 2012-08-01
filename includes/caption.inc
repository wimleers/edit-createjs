<?php

/**
 * Implements hook_filter_info().
 */
function edit_filter_info() {
  $filters['edit_filter_captioned_image'] = array(
    'title' => t('Captioned images'),
    'description' => t('Transforms <code>data-caption</code> attributes on <code>&lt;img&gt;</code> tags into captions.'),
    'process callback' => 'edit_captioned_image_process_filter',
    'tips callback' => 'edit_captioned_image_filter_tips',
  );
  return $filters;
}

/**
 * Filter process callback. Expands images with a data-caption attribute into
 * images with captions.
 */
function edit_captioned_image_process_filter($text, $filter) {  
  // Prevent useless processing if there are no data-caption attributes at all.
  if (stristr($text, 'data-caption') !== FALSE || stristr($text, 'data-align') !== FALSE) {
    $text = '<img src="http://localhost/7-std/sites/default/files/field/image/no%20outline%20between%20label%20and%20field.png" width="206" height="33" alt="" data-caption="magical caption!" title="" />';
    $text = '<img src="http://localhost/7-std/sites/default/files/field/image/no%20outline%20between%20label%20and%20field.png" width="206" height="33" alt="" data-caption="magical caption!" title="" />';
    $text = '<img src="http://localhost/7-std/sites/default/files/field/image/no%20outline%20between%20label%20and%20field.png" width="206" height="33" alt="" data-caption="magical caption!" title="" data-align="left"  />';

    $pattern = "#((<img\s+|<img\s+[^>]*\s+)(data-caption)\s*=\s*[\"|'])([^\"|^']*)([\"|'])(\s+[^>]*\s+)*(\s*/>|\s*></img>)#i";
    $text = preg_replace_callback($pattern, '_edit_captioned_image_filter_replace', $text);
  }
  return $text;
}

/**
 * Filter tips callback.
 */
function edit_captioned_image_filter_tips($filter, $format, $long = FALSE) {
  return t('You can add <code>data-caption</code> attributes to images to add captions.');
}

/**
 * Callback for preg_replace_callback() in edit_captioned_image_process_filter().
 */
function _edit_captioned_image_filter_replace($matches) {
  var_dump($matches);exit;
  return theme('edit_captioned_image', array(
    // Create the img tag *without* the data-caption attribute.
    'image'   => $matches[2] . $matches[5] . $matches[6],
    'caption' => $matches[3],
  ));
}



/**
 * @ingroup themeable
 * @{
 */

/**
 * Formats a field in a wrapper with the required metadata.
 */
function theme_edit_captioned_image($variables) {
  $output = '';

  $output .= '<div class="edit-captioned-image">';
  $output .= $variables['image'];
  $output .= '<div class="edit-captioned-image-caption">' . $variables['caption'] . '</div>';
  $output .= '</div>';
  
  return $output;

  // $align = 'none';
  // $item = $variables['image'];
  // $caption = $variables['caption'];
  // return '<div class="caption caption-'. $align .'"><div class="caption-inner" style="width: '. $width .';">'. $item . $caption .'</div></div>';

  
}

/**
 * @} End of "ingroup themeable".
 */
