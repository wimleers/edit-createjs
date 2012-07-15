<?php

/**
 * @file
 * Proposed modifications to Drupal core's filter module.
 */

/**
 * Wrap a macro, to make it suitable for in-place editing on the client-side.
 *
 * @param $macro
 *   A macro tag.
 * @param $value
 *   The value for the given macro tag.
 * @param $module
 *   The module that provides the macro.
 */
function filter_wrap_macro($macro, $value, $module) {
  $attributes = array(
    'class'               => 'edit-editable-macro',
    'data-macro'          => $macro,
    'data-macro-provider' => $module,
  );
  return '<span' . drupal_attributes($attributes) . '>' . $value . '</span>';
}

// Identical to check_markup() with the exception of the new $wrap_macro_tags
// argument, which is also passed on to the filter preprocess and process
// callbacks.
function check_markup2($text, $format_id = NULL, $langcode = '', $cache = FALSE, $wrap_macro_tags = TRUE) {
  if (!isset($format_id)) {
    $format_id = filter_fallback_format();
  }
  // If the requested text format does not exist, the text cannot be filtered.
  if (!$format = filter_format_load($format_id)) {
    watchdog('filter', 'Missing text format: %format.', array('%format' => $format_id), WATCHDOG_ALERT);
    return '';
  }

  // Check for a cached version of this piece of text.
  $cache = $cache && !empty($format->cache);
  $cache_id = '';
  if ($cache) {
    $cache_id = $format->format . ':' . $langcode . ':' . hash('sha256', $text);
    if ($cached = cache_get($cache_id, 'cache_filter')) {
      return $cached->data;
    }
  }

  // Convert all Windows and Mac newlines to a single newline, so filters only
  // need to deal with one possibility.
  $text = str_replace(array("\r\n", "\r"), "\n", $text);

  // Get a complete list of filters, ordered properly.
  $filters = filter_list_format($format->format);
  $filter_info = filter_get_filters();

  // Give filters the chance to escape HTML-like data such as code or formulas.
  foreach ($filters as $name => $filter) {
    if ($filter->status && isset($filter_info[$name]['prepare callback']) && function_exists($filter_info[$name]['prepare callback'])) {
      $function = $filter_info[$name]['prepare callback'];
      $text = $function($text, $filter, $format, $langcode, $cache, $cache_id, $wrap_macro_tags);
    }
  }

  // Perform filtering.
  foreach ($filters as $name => $filter) {
    if ($filter->status && isset($filter_info[$name]['process callback']) && function_exists($filter_info[$name]['process callback'])) {
      $function = $filter_info[$name]['process callback'];
      $text = $function($text, $filter, $format, $langcode, $cache, $cache_id, $wrap_macro_tags);
    }
  }

  // Cache the filtered text. This cache is infinitely valid. It becomes
  // obsolete when $text changes (which leads to a new $cache_id). It is
  // automatically flushed when the text format is updated.
  // @see filter_format_save()
  if ($cache) {
    cache_set($cache_id, $text, 'cache_filter');
  }

  return $text;
}
