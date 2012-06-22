<?php

/**
 * @file
 * All theme functions for the Edit module.
 */

/**
 * @ingroup themeable
 * @{
 */

/**
 * Format a Field wrapped in a span with metadata for the Edit module.
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
