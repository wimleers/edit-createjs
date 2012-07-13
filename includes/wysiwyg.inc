<?php
/**
 * @file
 * Logic to analyze compatibility of text formats with WYSIWYG editors.
 */

define('EDIT_WYSIWYG_ESSENTIAL_TAGS', 'p br');

/**
 * Analyze text format for WYSIWYG compatibility: every enabled filter must be
 * marked as compatible with WYSIWYG.
 *
 * @param $format_id
 *   A text format ID.
 * @return
 *   A boolean value that indicates whether the given text format is compatible
 *   with WYSIWYG.
 */
function edit_wysiwyg_analyze_format_compatibility($format_id) {
  $filters = filter_list_format($format_id);

  // Ignore filters that are disabled.
  $filters = array_filter($filters, function($filter) {
    return $filter->status == 1;
  });

  // Ensure all filters are marked as compatible with WYSIWYG.
  $compatible = array_reduce($filters, function($result, $filter) {
    $filters_metadata = filter_get_filters();
    return $result && ($filters_metadata[$filter->name]['edit']['wysiwyg'] === TRUE);
  }, TRUE);

  return $compatible;
}

/**
 * Retrieve all tags that are allowed by a given text format.
 *
 * @param $format_id
 *   A text format ID.
 * @return
 *   An array of HTML tags (in "p", not "<p>" format) that are allowed by the
 *   text format.
 */
function edit_wysiwyg_analyze_allowed_tags($format_id) {
  $filters = filter_list_format($format_id);

  // Ignore filters that are disabled.
  $filters = array_filter($filters, function($filter) {
    return $filter->status == 1;
  });

  // Ensure all filters are marked as compatible with WYSIWYG.
  $allowed_tags = array_reduce($filters, function($result, $filter) {
    $allowed_tags = array();
    $filters_metadata = filter_get_filters();

    if ($filters_metadata[$filter->name]['edit']['allowed_tags'] !== FALSE) {
      $setting_name = $filters_metadata[$filter->name]['edit']['allowed_tags'];
      $allowed_tags = explode(' ', $filter->settings[$setting_name]);
      $allowed_tags = str_replace(array('<', '>'), array('', ''), $allowed_tags);
    }

    return array_merge($result, $allowed_tags);
  }, array());

  return $allowed_tags;
}

/**
 * Get all filters in a given text format that have some sort of "allowed tags"
 * setting.
 *
 * @param $format_id
 *   A text format ID.
 * @return
 *   An array of filter ids that have an "allowed tags" setting.
 */
function edit_wysiwyg_filters_with_allowed_tags($format_id) {
  $filters = filter_list_format($format_id);

  // Ignore filters that are disabled.
  $filters = array_filter($filters, function($filter) {
    return $filter->status == 1;
  });

  // Ignore filters that don't have an "allowed_tags" setting.
  $filters = array_filter($filters, function($filter) {
    $filters_metadata = filter_get_filters();

    return ($filters_metadata[$filter->name]['edit']['allowed_tags'] !== FALSE);
  });

  return array_keys($filters);
}

/**
 * Given a list of allowed tags, detect which essential WYSIWYG tags (as set in
 * the EDIT_WYSIWYG_ESSENTIAL_TAGS define) are not allowed.
 *
 * @param $allowed_tags
 *   A list of allowed tags.
 * @return
 *   An array of essential HTML tags that are not in the given list of allowed
 *   tags.
 */
function edit_wysiwyg_essential_tags_missing($allowed_tags) {
  $essential_tags = explode(' ', EDIT_WYSIWYG_ESSENTIAL_TAGS);
  return array_diff($essential_tags, $allowed_tags);
}
