<?php
/**
 * @file
 * Logic to analyze compatibility of text formats with WYSIWYG editors.
 */

define('EDIT_WYSIWYG_ESSENTIAL_TAGS', 'p br');

/**
 * Given a field (with cardinality 1) that defaults to "direct" editability and
 * WYSIWYG support, check whether the field settings and text format don't
 * force it to "form" editability or even disabled editability.
 *
 */
function edit_wysiwyg_analyze_field_editability($entity_type, $entity, $field_name, $format_id) {
  // The field must be configured to use text processing.
  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);
  $instance_info = field_info_instance($entity_type, $field_name, $bundle);

  if (empty($instance_info['settings']['text_processing'])) {
    // This field is configured to not use text processing; hence fall back to
    // "form".
    return 'form';
  }
  // Bail out with an appropriate warning if the field has text processing
  // enabled, but no format is assigned yet, e.g. when the field is still
  // empty (NULL).
  elseif (empty($format_id)) {
    return 'disabled';
  }
  else {
    // The final analysis. Analyzes the compatibility with a WYSIWYG based on
    // the formats used.
    $filters = filter_list_format($format_id);
    if (!edit_wysiwyg_analyze_format_compatibility($filters)) {
      return 'disabled';
    }
    // Check whether HTML filter is enabled.
    // @todo Core: Provide a generic + reliable facility for determining text
    //   processors and security filters in a text format.
    if (!empty($filters['filter_html']->status)) {
      // Extract allowed tags; ensure these include the essential tags.
      $allowed_tags = edit_wysiwyg_analyze_allowed_tags($format_id);
      $essential_missing_tags = edit_wysiwyg_essential_tags_missing($allowed_tags);
      if (count($essential_missing_tags)) {
        // @TODO: handle this more elegantly. And only show it to users with
        // sufficient permissions.
        $formats = filter_formats();
        $filters_with_allowed_tags = array_map(function($filter) {
          $filters = filter_get_filters();
          return $filters[$filter]['title'];
        }, edit_wysiwyg_filters_with_allowed_tags($format_id));
        // Warn the user and point him/her in the right direcotion.
        drupal_set_message(
          t('For in-place editing of the %field field, some essential HTML
            tags are missing from the list of allowed tags:
            %essential-missing-tags. Please <a href="!url">add them</a> to
            the %text-format text format\'s allowed tags in the %filters
            filter.',
            array(
              '%field' => $instance_info['label'],
              '%essential-missing-tags' => '<' . implode('>, <', $essential_missing_tags) . '>',
              '!url' => url("admin/config/content/formats/$format_id"),
              '%text-format' => $formats[$format_id]->name,
              '%filters' => implode(' ' . t('or') . ' ', $filters_with_allowed_tags),
            )
          ),
          'error'
        );
        return 'disabled';
      }
    }
  }

  // Nothing found that indicates this field cannot use "direct" editability.
  return 'direct';
}

/**
 * Get all unique filter classifications used by a given text format.
 *
 * @param $format_id
 *   A text format ID.
 * @return array
 *   All filter classifications used by filters of the given text format.
 */
function edit_wysiwyg_format_get_filter_classifications($format_id) {
  $filter_classifications = array();

  $filters = filter_list_format($format_id);

  // Ignore filters that are disabled.
  $filters = array_filter($filters, function($filter) {
    return $filter->status == 1;
  });

  $filters_metadata = filter_get_filters();
  foreach ($filters as $filter) {
    $classification = (!empty($filters_metadata[$filter->name]['edit']['classification']))
      ? $filters_metadata[$filter->name]['edit']['classification']
      : FALSE;
    if ($classification && !in_array($classification, $filter_classifications)) {
      $filter_classifications[] = $classification;
    }
  }

  return $filter_classifications;
}

/**
 * Analyze text format for WYSIWYG compatibility: every enabled filter must be
 * marked as compatible with WYSIWYG.
 *
 * @param array $filters
 *   A list of filters in a potentially editable text field, as provided by
 *   filter_list_format().
 *
 * @return bool
 *   A boolean value that indicates whether the given text format is compatible
 *   with WYSIWYG.
 */
function edit_wysiwyg_analyze_format_compatibility($filters) {
  // Ignore filters that are disabled.
  $filters = array_filter($filters, function($filter) {
    return $filter->status == 1;
  });

  // Ensure all filters are marked as compatible with WYSIWYG.
  $compatible = array_reduce($filters, function($result, $filter) {
    $filters_metadata = filter_get_filters();
    return $result && (!empty($filters_metadata[$filter->name]['edit']) && $filters_metadata[$filter->name]['edit']['wysiwyg'] === TRUE);
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
