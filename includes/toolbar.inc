<?php

/**
 * @file
 * All logic for altering the toolbar, including some hooks. Hence this include
 * file must *always* be loaded by the .module file.
 */

/**
 * Implements hook_page_alter().
 */
function edit_page_alter(&$page) {
  if (isset($page['page_top']['toolbar'])) {
    // Remove the toolbar drawer toggle by overriding toolbar.module's pre-render
    // function with our own.
    if (isset($page['page_top']['toolbar']['#pre_render'][0]) && $page['page_top']['toolbar']['#pre_render'][0] == 'toolbar_pre_render') {
      $page['page_top']['toolbar']['#pre_render'][0] = 'edit_override_toolbar_pre_render';
    }
    // Replace the shortcut.module's toolbar pre-render function with our own.
    if (isset($page['page_top']['toolbar']['#pre_render'][1]) && $page['page_top']['toolbar']['#pre_render'][1] == 'shortcut_toolbar_pre_render') {
      $page['page_top']['toolbar']['#pre_render'][1] = 'edit_override_shortcut_toolbar_pre_render';
    }

    // If the toolbar is available, add a pre-render function to display the
    // view/edit mode toggle.
    $page['page_top']['toolbar']['#pre_render'][] = 'edit_toolbar_pre_render';
  }
}

/**
 * Implements hook_module_implements_alter().
 */
function edit_module_implements_alter(&$implementations, $hook) {
  // Run edit's hook_page_alter() after shortcut's, but retain the ordering.
  // We need this to be able to override shortcut's #pre_render callback for
  // rendering the shortcuts into the toolbar.
  if ($hook == 'page_alter') {
    unset($implementations['edit']);
    $index = array_search('shortcut', array_keys($implementations));
    $implementations = array_slice($implementations, 0, $index + 1) + array('edit' => FALSE) + array_slice($implementations, $index + 1);
  }
}

/**
 * Pre-render function for edit.module; view/edit mode toggle.
 */
function edit_toolbar_pre_render($toolbar) {
  $module_path = drupal_get_path('module', 'edit');
require_once 'includes/form.inc';
  $toolbar['toolbar_drawer'][] = array(
    'view_edit_toggle' => array(
      // TODO: make this less hacky; but we might move to something else than radios!
      '#markup' => '
<div id="edit-view-edit-toggle" class="form-radios">
  <div class="form-item form-type-radio">
    <input type="radio" id="edit-view-edit-toggle--view" value="view" class="form-radio" name="edit_view_edit_toggle" checked="checked">
    <label class="option" for="edit-view-edit-toggle--view">' . t('View') . '</label>
  </div>
  <div class="form-item form-type-radio">
    <input type="radio" id="edit-view-edit-toggle--edit" value="edit" class="form-radio" name="edit_view_edit_toggle">
    <label class="option" for="edit-view-edit-toggle--edit">' . t('Edit') . '</label>
  </div>
</div>',
      '#attached' => array(
        'library' => array(
          array('system', 'jquery.form'),
          array('system', 'drupal.ajax'),
        ),
        'js' => array(
          $module_path . '/js/edit.js',
          array(
            'data' => array('edit' => array('fieldFormURL' => url('admin/edit/field/!entity_type/!id/!field_name'))),
            'type' => 'setting',
          ),
        ),
        'css' => array(
          $module_path . '/css/edit.css',
        ),
      ),
    ),
  );

  return $toolbar;
}

/**
 * Override of pre-render function for toolbar.module.
 */
function edit_override_toolbar_pre_render($toolbar) {
  // The original.
  $toolbar = toolbar_pre_render($toolbar);

  // The toolbar should never be collapsed.
  $_COOKIE['Drupal_toolbar_collapsed'] = 0;

  // Now we remove the toolbar drawer toggle.
  unset($toolbar['toolbar_toggle']);

  $toolbar['#attached']['css'][] = drupal_get_path('module', 'edit') . '/css/toolbar-overrides.css';

  return $toolbar;
}

/**
 * Override of pre-render function for shortcut.module.
 */
function edit_override_shortcut_toolbar_pre_render($toolbar) {
  // The original.
  $toolbar = shortcut_toolbar_pre_render($toolbar);

  // Put the shortcuts themselves *after* their configure link in the HTML,
  // because we'll float them right.
  $shortcuts = array_shift($toolbar['toolbar_drawer'][0]);
  array_push($toolbar['toolbar_drawer'][0], $shortcuts);

  $toolbar['#attached']['css'][] = drupal_get_path('module', 'edit') . '/css/toolbar-overrides.css';

  return $toolbar;
}
