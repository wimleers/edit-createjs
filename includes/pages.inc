<?php
/**
 * @file
 * AJAX endpoint to retrieve & save subforms for fields and re-render fields.
 */

/**
 * Page callback: Provides editing of entity fields.
 */
function edit_field_edit($entity_type, $entity_id, $field_name, $langcode = NULL) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    return MENU_NOT_FOUND;
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    return MENU_NOT_FOUND;
  }

  $entities = entity_load($entity_type, array($entity_id));
  if (!$entities) {
    return MENU_NOT_FOUND;
  }

  $entity = reset($entities);
  if (!$entity) {
    return MENU_NOT_FOUND;
  }

  if (!isset($langcode) && isset($entity->language)) {
    $langcode = $entity->language;
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    return MENU_ACCESS_DENIED;
  }

  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);

  // This allows us to have limited support for non-field API fields. Currently,
  // we only have support for node:title, node:author and node:created.
  if ($entity_type == 'node' && in_array($field_name, array('title', 'author', 'created'))) {
    $field_instance = TRUE;
    switch ($field_name) {
      case 'title':
        $subform_id = 'fape_field_edit_node_title_form';
        break;
      case 'author':
        $subform_id = 'editfape_field_edit_node_author_form';
        break;
      case 'created':
        $subform_id = 'editfape_field_edit_node_created_form';
        break;
    }
    if (!node_access('update', $entity)) {
      return MENU_ACCESS_DENIED;
    }
  }
  else {
    $field_instance = field_info_instance($entity_type, $field_name, $bundle);
    $subform_id = 'fape_field_edit_field_form';
  }

  if (empty($field_instance)) {
    return MENU_NOT_FOUND;
  }

  $form_state = array(
    'entity_type' => $entity_type,
    'entity' => $entity,
    'field_name' => $field_name,
    'langcode' => $langcode,
    'no_redirect' => TRUE,
    'field_instance' => $field_instance,
    'bundle' => $bundle,
    'subform_id' => $subform_id,
    // We use this in our hook_form_alter() implementation so that we don't
    // alter FAPE's forms when it's used by FAPE itself.
    'editability' => TRUE,
  );

  if (in_array($field_name, array('author', 'created'))) {
    // @todo For some unknown, weird reason, form_load_include() breaks the
    // code.
    //form_load_include($form_state, 'inc', 'edit', 'includes/fape');
    module_load_include('inc', 'edit', 'includes/fape');
  }

  $commands = array();
  $form = drupal_build_form('fape_field_edit_form', $form_state);
  if (!empty($form_state['executed'])) {
    entity_save($entity_type, $form_state['entity']);
    // Reload the entity. This is necessary for some fields; otherwise we'd
    // render the field without the updated values.
    $entity = reset(entity_load($entity_type, array($entity_id)));

    // Pseudo-field: title.
    if ($entity_type == 'node' && $field_name == 'title') {
      $commands[] = array(
        'command' => 'edit_field_form_saved',
        'id'      => "$entity_type:$id:$field_name",
      );
    }
    // Pseudo-fields: name and date.
    elseif ($entity_type == 'node' && in_array($field_name, array('author', 'created'))) {
      $commands[] = array(
        'command' => 'edit_field_form_saved',
        'id'      => "$entity_type:$id:$field_name",
        'data'    => edit_node_render_submitted(
          edit_node_wrap_name(theme('username', array('account' => $entity)), $id),
          edit_node_wrap_date(format_date($entity->created), $id)
        ),
      );
    }
    // All other fields.
    else {
      $commands[] = array(
        'command' => 'edit_field_form_saved',
        'id'      => "$entity_type:$id:$field_name",
        'data'    => drupal_render(field_view_field($entity_type, $entity, $field_name)),
      );
    }
  }
  else {
    $commands[] = array(
      'command' => 'edit_field_form',
      'id'      => "$entity_type:$id:$field_name",
      'data'    => drupal_render($form),
    );
  }
  return array('#type' => 'ajax', '#commands' => $commands);
}
