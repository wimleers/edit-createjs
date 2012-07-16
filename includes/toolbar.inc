<?php
/**
 * @file
 * Integrates the Edit module with the Toolbar module.
 *
 * Contains all the logic for altering the toolbar, including some hooks. Hence,
 * this include file must *always* be loaded by the .module file.
 */

/**
 * Implements hook_page_alter().
 */
function edit_page_alter(&$page) {
  // Don't provide a view/edit toggle on admin pages, node/add and node/%/edit pages.
  if (arg(0) == 'admin' || (arg(0) == 'node' && arg(1) == 'add') || (arg(0) == 'node' && arg(2) == 'edit')) {
    return;
  }

  if (isset($page['page_top']['toolbar'])) {
    // Remove the toolbar drawer toggle by overriding Toolbar module's
    // pre-render function with our own implementation.
    if (isset($page['page_top']['toolbar']['#pre_render'][0]) && $page['page_top']['toolbar']['#pre_render'][0] == 'toolbar_pre_render') {
      $page['page_top']['toolbar']['#pre_render'][0] = 'edit_override_toolbar_pre_render';
    }
    // Replace the Shortcut module's toolbar pre-render function with our own
    // implementation.
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
  // Run Edit module's hook_page_alter() after the one in Shortcut module, but
  // retain the ordering. We need this to be able to override Shortcut modules's
  // #pre_render callback for rendering the shortcuts into the toolbar.
  if ($hook == 'page_alter') {
    unset($implementations['edit']);
    $index = array_search('shortcut', array_keys($implementations));
    $implementations = array_slice($implementations, 0, $index + 1) + array('edit' => FALSE) + array_slice($implementations, $index + 1);
  }
}

/**
 * Pre-render function to add the view/edit mode toggle widget to the toolbar.
 */
function edit_toolbar_pre_render($toolbar) {
  $module_path = drupal_get_path('module', 'edit');
require_once 'includes/form.inc';
  $toolbar['toolbar_drawer'][] = array(
    'view_edit_toggle' => array(
      // @todo Make this less hacky. We might end up using something other than
      // radios.
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
          array('edit', 'edit.frontend'),
        ),
      ),
    ),
  );

  return $toolbar;
}

/**
 * Overrides the Toolbar module's toolbar pre-render function.
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
 * Overrides the Shortcut module's toolbar pre-render function.
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
