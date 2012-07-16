<?php
/**
 * @file
 * Integrates the Edit module on Drupal's back-end entity forms.
 *
 * @TODO: refactor, refactor, refactor! Incomplete. Hacky. Look at http://drupal.org/project/wysiwyg.
 */

/**
 * Implements hook_field_widget_info_alter().
 */
function edit_field_widget_info_alter(&$info) {
  $wysiwyg_metadata = array(
    'text_textarea_with_summary',
  );

  foreach ($wysiwyg_metadata as $widget) {
    if (!empty($info[$widget])) {
      $info[$widget]['settings']['edit'] = array(
        'wysiwyg' => TRUE,
      );
    }
  }
}

/**
 * Implements hook_field_widget_form_alter().
 */
function edit_field_widget_form_alter(&$element, &$form_state, $context) {
  if (isset($context['instance']['settings']['text_processing'])
      && $context['instance']['settings']['text_processing']
      && !empty($context['instance']['widget']['settings']['edit']['wysiwyg']))
  {
    $format_id = $element['#format'];
    $entity    = $element['#entity'];
    $entity_type = $context['instance']['entity_type'];
    $field_name  = $context['instance']['field_name'];

    // Update the editability based on the field's settings and the text format.
    module_load_include('inc', 'edit', 'includes/wysiwyg');
    $editability = edit_wysiwyg_analyze_field_editability($entity_type, $entity, $field_name, $format_id);
    // Only mark for inline editing when
    if ($editability == 'direct') {
      // Figure out which library dependency to set for WYSIWYG editor integration.
      $wysiwyg_module = variable_get(EDIT_WYSIWYG_VARIABLE, EDIT_WYSIWYG_DEFAULT);

      $element['#attached']['library'][] = array('edit', 'edit.backend');
      $element['#attributes']['class'][] = 'edit-backend-wysiwyg';
    }
  }
}
