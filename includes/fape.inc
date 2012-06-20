<?php

//-----------------------------------------------------------------------------
// These will hopefully be moved into the FAPE module.

/**
 * Subform to edit the entity 'name' field.
 *
 * This isn't a true form. As such it modifies the $form by reference.
 */
function ipefape_field_edit_node_name_form(&$form, &$form_state) {
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

  $form['#submit'][] = 'ipefape_field_edit_node_name_form_submit';
}

function ipefape_field_edit_node_name_form_submit($form, &$form_state) {
  $form_state['entity']->name = $form_state['values']['name'];
}

/**
 * Subform to edit the entity 'date' field.
 *
 * This isn't a true form. As such it modifies the $form by reference.
 */
function ipefape_field_edit_node_date_form(&$form, &$form_state) {
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

  $form['#submit'][] = 'ipefape_field_edit_node_date_form_submit';
}

function ipefape_field_edit_node_date_form_submit($form, &$form_state) {
  $form_state['entity']->date = $form_state['values']['date'];
}
