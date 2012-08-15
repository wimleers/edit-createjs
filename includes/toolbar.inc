<?php
/**
 * @file
 * Integrates the Edit module with the Navigation bar module.
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

  if (isset($page['page_top']['navbar'])) {
    // If the toolbar is available, add a pre-render function to display the
    // view/edit mode toggle.
    $page['page_top']['navbar']['#pre_render'][] = 'edit_navbar_pre_render';
  }
}

/**
 * Pre-render function to add the view/edit mode toggle widget to the toolbar.
 */
function edit_navbar_pre_render($navbar) {

  // If we have primary tabs and a View tab is present, remove that tab in favor
  // of our view/edit tabs. The edit tab is renamed elsewhere to avoid confusion.
  if (!empty($navbar['navbar_drawer'][0]['#primary'])) {
    foreach ($navbar['navbar_drawer'][0]['#primary'] as $index => $item) {
      if ($item['#link']['title'] == t('View')) {
        unset($navbar['navbar_drawer'][0]['#primary'][$index]);
      }
    }
  }

  $navbar_drawer_prepend = array(
    'view_edit_toggle' => array(
      '#prefix' => '<h2 class="element-invisible">' . t('In-place edit operations') . '</h2><ul class="tabs primary" id="edit_view-edit-toggles">',
      '#suffix' => '</ul>',
      'content' => array(
        array(
          '#theme' => 'menu_local_task',
          '#link' => array('title' => t('View'), 'href' => $_GET['q'], 'localized_options' => array('attributes' => array('class' => array('edit_view-edit-toggle', 'edit-view')))),
          '#active' => TRUE,
        ),
        array(
          '#theme' => 'menu_local_task',
          '#link' => array('title' => t('Edit'), 'href' => '#', 'localized_options' => array('attributes' => array('class' => array('edit_view-edit-toggle', 'edit-edit')))),
        ),
      ),

      // @todo Make this less hacky. We might end up using something other than
      // radios.
      /*'#markup' => '
<div id="edit_view-edit-toggle" class="form-radios">
  <div class="form-item form-type-radio">
    <input type="radio" id="edit_view-edit-toggle--view" value="view" class="form-radio" name="edit_view_edit_toggle" checked="checked">
    <label class="option" for="edit_view-edit-toggle--view">' . t('View') . '</label>
  </div>
  <div class="form-item form-type-radio">
    <input type="radio" id="edit_view-edit-toggle--edit" value="edit" class="form-radio" name="edit_view_edit_toggle">
    <label class="option" for="edit_view-edit-toggle--edit">' . t('Edit') . '</label>
  </div>
</div>',*/
      '#attached' => array(
        'library' => array(
          array('edit', 'edit.frontend'),
        ),
      ),
    ),
  );
  $navbar['navbar_drawer'] = array_merge($navbar_drawer_prepend, $navbar['navbar_drawer']);
  return $navbar;
}
