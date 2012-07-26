<?php

/**
 * @file
 *   Drush integration for Edit: Aloha Editor.
 */

/**
 * The Aloha Editor download URI.
 */
define('EDIT_ALOHA_DOWNLOAD_URI', 'https://github.com/downloads/alohaeditor/Aloha-Editor/alohaeditor-0.21.0.zip');

/**
 * Implementats hook_drush_command().
 *
 * In this hook, you specify which commands your
 * drush module makes available, what it does and
 * description.
 *
 * Notice how this structure closely resembles how
 * you define menu hooks.
 *
 * See `drush topic docs-commands` for a list of recognized keys.
 *
 * @return
 *   An associative array describing your command(s).
 */
function edit_aloha_drush_command() {
  $items = array();

  // The key in the $items array is the name of the command.
  $items['edit-aloha-download'] = array(
    'callback' => 'drush_edit_aloha_download',
    'description' => dt("Downloads Aloha Editor."),
    'bootstrap' => DRUSH_BOOTSTRAP_DRUSH, // No bootstrap.
    'arguments' => array(
      'path' => dt('Optional. A path where to install Aloha Editor. If omitted, Drush will use the default location.'),
    ),
  );

  return $items;
}

/**
 * Implementation of hook_drush_help().
 *
 * This function is called whenever a drush user calls
 * 'drush help <name-of-your-command>'
 *
 * @param
 *   A string with the help section (prepend with 'drush:')
 *
 * @return
 *   A string with the help text for your command.
 */
function edit_aloha_drush_help($section) {
  switch ($section) {
    case 'drush:edit-aloha-download':
      return dt("Downloads the Aloha Editor files from http://aloha-editor.org, default location is sites/all/libraries.");
  }
}

/**
 * Command to download Aloha Editor.
 */
function drush_edit_aloha_download() {
  if (!drush_shell_exec('type unzip')) {
    return drush_set_error(dt('Missing dependency: unzip. Install it before using this command.'));
  }

  $args = func_get_args();
  if (!empty($args[0])) {
    $path = $args[0];
  }
  else {
    $path = 'sites/all/libraries';
  }

  // Create the path if it does not exist.
  if (!is_dir($path)) {
    drush_op('mkdir', $path);
    drush_log(dt('Directory @path was created.', array('@path' => $path)), 'notice');
  }

  // Set the directory to the download location.
  $olddir = getcwd();
  chdir($path);

  $filename = basename(EDIT_ALOHA_DOWNLOAD_URI);
  $dirname = basename(EDIT_ALOHA_DOWNLOAD_URI, '.zip');

  // Remove any existing aloha plugin directory
  if (is_dir($dirname)) {
    drush_log(dt('An existing Aloha Editor was overwritten at @path.', array('@path' => $path)), 'notice');
  }
  // Remove any existing aloha plugin zip archive
  if (is_file($filename)) {
    drush_op('unlink', $filename);
  }

  // Download the zip archive
  if (!drush_shell_exec('wget ' . EDIT_ALOHA_DOWNLOAD_URI)) {
    drush_shell_exec('curl -O ' . EDIT_ALOHA_DOWNLOAD_URI);
  }

  if (is_file($filename)) {
    // Decompress the zip archive
    drush_shell_exec('unzip -qq -o ' . $filename . ' -d aloha');
    // Remove the zip archive
    drush_op('unlink', $filename);
  }

  // Set working directory back to the previous working directory.
  chdir($olddir);
  if (is_dir($path . '/aloha')) {
    drush_log(dt('Aloha Editor has been downloaded to @path.', array('@path' => $path)), 'success');
  }
  else {
    drush_log(dt('Drush was unable to download Aloha Editor to @path.', array('@path' => $path)), 'error');
  }
}
