<?php
/**
 * @file
 * Edit: Aloha Editor page callbacks.
 */

/**
 * Page callback; Drupal link repository look-up.
 */
function edit_aloha_link_lookup($lookup = false) {
  $lookup = check_plain($lookup);

  $search_results = node_search_execute($lookup);

  if (is_array($search_results) && empty($search_results[0])) {
    $search_results = false;
  }

  if (is_array($search_results)) {
    $json = array();
    foreach ($search_results as $result) {
      $json[] = array('u' => $result['link'], 't' => $result['title'], 's' => $result['score']);
    }
    print drupal_json_encode($json);
    exit;
  }
}
