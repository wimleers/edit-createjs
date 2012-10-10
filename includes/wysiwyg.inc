<?php
/**
 * @file
 * Logic to analyze compatibility of text formats with WYSIWYG editors.
 */

/**
 * Given a field (with cardinality 1) that defaults to "direct" editability and
 * WYSIWYG support, check whether the field settings and text format don't
 * force it to "form" editability or even disabled editability.
 */
function edit_wysiwyg_analyze_field_editability($entity_type, $entity, $field_name, $format_id) {
  // The field must be configured to use text processing.
  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);
  $instance_info = field_info_instance($entity_type, $field_name, $bundle);

  // This field is configured to not use text processing; hence fall back to
  // form-based editing.
  if (empty($instance_info['settings']['text_processing'])) {
    return 'form';
  }
  // If the field has text processing enabled, but no format is assigned yet,
  // (e.g. when the field is still empty (NULL)), then provide form-based
  // editing, so that the user is able to select a text format.
  // (Direct editing doesn't allow the user to change the format.)
  elseif (empty($format_id)) {
    return 'form';
  }
  // When the text format uses >=1 filters that generate HTML, disallow direct
  // editing, and fall back to form-based editing.
  elseif (in_array(FILTER_TYPE_HTML_GENERATOR, filter_get_filter_types_by_format($format_id))) {
    return 'form';
  }
  else {
    $allowed_tags = filter_get_allowed_tags_by_format($format_id);

    if ($allowed_tags === TRUE) {
      // *No* disallowed tags.
      return 'direct';
    }

    // <br> and <p> tags are necessary!
    if (in_array('br', $allowed_tags) && in_array('p', $allowed_tags)) {
      return 'direct';
    }
    else {
      // Warn the user and point him/her in the right direcotion.
      drupal_set_message(
        t('For in-place editing of the %field field, some essential HTML
          tags are missing from the list of allowed tags: <code><br></code> and
          <code><p></code> <em>both</em> need to be allowed. Please
          <a href="!url">add them</a> to the %text-format text format\'s
          allowed tags.',
          array(
            '%field' => $instance_info['label'],
            '!url' => url("admin/config/content/formats/$format_id"),
            '%text-format' => $formats[$format_id]->name,
          )
        ),
        'error'
      );
      return 'form';
    }
  }
  return 'direct';
}
