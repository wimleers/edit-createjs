<?php

//-----------------------------------------------------------------------------
// This will hopefully be accepted into the FAPE module: http://drupal.org/node/1650442.

/**
 * Subform to edit the entity 'author' field.
 *
 * This isn't a true form. As such it modifies the $form by reference.
 */
function editfape_field_edit_node_author_form(&$form, &$form_state) {
  $node = $form_state['entity'];

  $form['name'] = array(
    '#type' => 'textfield',
    '#title' => t('Authored by'),
    '#maxlength' => 60,
    '#autocomplete_path' => 'user/autocomplete',
    '#default_value' => !empty($node->name) ? $node->name : '',
    '#weight' => -1,
    '#description' => t('Leave blank for %anonymous.', array('%anonymous' => variable_get('anonymous', t('Anonymous')))),
  );

  $form['#validate'][] = 'editfape_field_edit_node_author_form_validate';
  $form['#submit'][]   = 'editfape_field_edit_node_author_form_submit';
}

// Taken from node_validate().
function editfape_field_edit_node_author_form_validate($form, &$form_state) {
  $name = $form_state['values']['name'];
  if (!empty($name) && !($account = user_load_by_name($name))) {
    // The use of empty() is mandatory in the context of usernames
    // as the empty string denotes the anonymous user. In case we
    // are dealing with an anonymous user we set the user ID to 0.
    form_set_error('name', t('The username %name does not exist.', array('%name' => $name)));
  }
}

// Taken from node_submit().
function editfape_field_edit_node_author_form_submit($form, &$form_state) {
  if ($account = user_load_by_name($form_state['values']['name'])) {
    $form_state['entity']->uid = $account->uid;
  }
  else {
    $form_state['entity']->uid = 0;
  }
}

/**
 * Subform to edit the entity 'created' field.
 *
 * This isn't a true form. As such it modifies the $form by reference.
 */
function editfape_field_edit_node_created_form(&$form, &$form_state) {
  $node = $form_state['entity'];
  // node_object_prepare() is necessary to calculate node->date!
  node_object_prepare($node);

  $form['date'] = array(
    '#type' => 'textfield',
    '#title' => t('Authored on'),
    '#maxlength' => 25,
    '#description' => t('Format: %time. The date format is YYYY-MM-DD and %timezone is the time zone offset from UTC. Leave blank to use the time of form submission.', array('%time' => !empty($node->date) ? date_format(date_create($node->date), 'Y-m-d H:i:s O') : format_date($node->created, 'custom', 'Y-m-d H:i:s O'), '%timezone' => !empty($node->date) ? date_format(date_create($node->date), 'O') : format_date($node->created, 'custom', 'O'))),
    '#default_value' => !empty($node->date) ? $node->date : '',
  );

  $form['#validate'][] = 'editfape_field_edit_node_created_form_validate';
  $form['#submit'][]   = 'editfape_field_edit_node_created_form_submit';
}

// Taken from node_validate().
function editfape_field_edit_node_created_form_validate($form, &$form_state) {
  $date = $form_state['values']['date'];
  if (!empty($date) && strtotime($date) === FALSE) {
    form_set_error('date', t('You have to specify a valid date.'));
  }
}

// Taken from node_submit().
function editfape_field_edit_node_created_form_submit($form, &$form_state) {
  $date = $form_state['values']['date'];
  $form_state['entity']->created = !empty($date) ? strtotime($date) : REQUEST_TIME;
}