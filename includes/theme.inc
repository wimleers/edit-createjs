<?php
/**
 * @file
 * Provides theme functions for the Edit module.
 */

/**
 * @ingroup themeable
 * @{
 */

/**
 * Formats a field in a wrapper with the required metadata.
 */
function theme_edit_spanned_field($variables) {
  $output = '';

  $output .= '<span class="' . $variables['classes'] . '"';
  $output .= ' data-edit-id="' . $variables['edit_id'] . '"';
  $output .= ' data-edit-field-label="' . $variables['label'] . '">';
  $output .= $variables['value']; // The field value.
  $output .= '</span>';

  return $output;
}

/**
 * @} End of "ingroup themeable".
 */
