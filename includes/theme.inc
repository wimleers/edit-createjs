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
  $variables['attributes']['data-edit-id'] = $variables['edit_id'];
  $variables['attributes']['data-edit-field-label'] = $variables['label'];

  $attributes = drupal_attributes($variables['attributes']);

  return '<span' . $attributes . '>' .  $variables['value'] . '</span>';
}

/**
 * @} End of "ingroup themeable".
 */
