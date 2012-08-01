<?php

/**
 * Implements hook_init().
 */
function edit_init() {
  $path = drupal_get_path('module', 'edit');
  drupal_add_css($path .'/css/edit-captioned-image-filter.css', array('every_page' => TRUE));
}

/**
 * Implements hook_filter_info().
 */
function edit_filter_info() {
  $filters['edit_filter_captioned_image'] = array(
    'title' => t('Captioned images'),
    'description' => t('Transforms <code>data-caption</code> attributes on <code>&lt;img&gt;</code> tags into captions.'),
    'process callback' => 'edit_captioned_image_process_filter',
    'tips callback' => 'edit_captioned_image_filter_tips',
  );
  return $filters;
}

/**
 * Filter process callback. Expands images with a data-caption attribute into
 * images with captions.
 */
function edit_captioned_image_process_filter($text, $filter) {
  $search = array();
  $replace = array();

  // Prevent useless processing if there are no data-caption attributes at all.
  if (stristr($text, 'data-caption') !== FALSE || stristr($text, 'data-align') !== FALSE) {
    // Original regexp-based approach, which didn't work well anymore once you
    // had both data-caption and data-original attributes instead of just one.
    // $pattern = "#(?:(<img\s+|<img\s+)"; // Opening of image tag.
    // $pattern .= "([^>]*\s+)*"; // attributes up to the first data-caption or align attribute.
    // $pattern .= "(?:(?:(data-caption|data-align)\s*=\s*[\"|'])([^\"|^']*)(?:[\"|'])(\s+[^>]*\s+)*)";
    // $pattern .= "([^>]*\s+)*?"; // attributes up to the first data-caption or align attribute.
    // $pattern .= "(?:(?:(data-align|data-caption)\s*=\s*[\"|'])([^\"|^']*)(?:[\"|'])(\s+[^>]*\s+)*)*";
    // $pattern .= ")(\s*/>|\s*></img>)#i"; // Closing of image tag.
    // $text = preg_replace_callback($pattern, '_edit_captioned_image_filter_replace', $text);

    // Iterate over all images that have data-caption and/or data-align
    // attributes. Remove these attributes and wrap the image in a caption.
    $pattern = "#(?:(?:<img\s+|<img\s+[^>]*\s+)(?:data-caption|data-align)\s*.*(?:\s*/>|\s*></img>))#i";
    if (preg_match_all($pattern, $text, $matches)) {
      foreach ($matches[0] as $image_html) {
        $dom = filter_dom_load($image_html);
        $image_node = $dom->getElementsByTagName('img')->item(0);
        $caption = NULL;
        $align = 'center';

        // Retrieve, then remove the data-caption and data-align attributes.
        if ($image_node->hasAttribute('data-caption')) {
          $caption = $image_node->getAttribute('data-caption');
          $image_node->removeAttribute('data-caption');
        }
        if ($image_node->hasAttribute('data-align')) {
          $align = $image_node->getAttribute('data-align');
          $image_node->removeAttribute('data-align');
        }

        // Given the updated image node, caption, alignment and width: re-render
        // the image with a caption.
        $altered_image_html = theme('edit_captioned_image', array(
          'image'   => $image_node->C14N(),
          'caption' => $caption,
          'align'   => $align,
          'width'   => _edit_filter_get_width($image_node),
        ));

        // Load the new HTML into a new DOMDocument.
        $dom2 = filter_dom_load($altered_image_html);
        // Locate the snippet of HTML we're interested in.
        $dom2_image_node = $dom2->getElementsByTagName('body')->item(0)
                                ->childNodes->item(0);
        // Import the new "image" node from the second DOMDocument into the main
        // one, importing also the child nodes of the new "image" node.
        $new_image_node = $dom->importNode($dom2_image_node, TRUE);
        // Finally, replace the original image node with the new image node!
        $image_node->parentNode->replaceChild($new_image_node, $image_node);

        $new_html = filter_dom_serialize($dom);

        $search[] = $image_html;
        $replace[] = $new_html;
      }
    }
  }

  return str_replace($search, $replace, $text);
}

/**
 * Determine the width of the img/object that is being captioned.
 *
 * @see _caption_filter_get_width().
 */
function _edit_filter_get_width(DOMNode $image_node) {
  // Retrieve the width attribute, or calculate the width directly from
  // the image.
  if ($image_node->hasAttribute('width')) {
    $width = $image_node->getAttribute('width');
  }
  else {
    if ($image_node->hasAttribute('src')) {
      list($width) = getimagesize($image_node->getAttribute('src'));
    }
    else {
      // We cannot determine the width so just set it to the default CSS value.
      $width = 'auto';
    }
  }

  // We need to append the 'px' to any numeric widths.
  if (is_numeric($width)) {
    $width = $width . 'px';
  }

  return $width;
}

/**
 * Filter tips callback.
 */
function edit_captioned_image_filter_tips($filter, $format, $long = FALSE) {
  return t('You can add <code>data-caption</code> attributes to images to add captions.');
}


/**
 * @ingroup themeable
 * @{
 */

/**
 * Formats a field in a wrapper with the required metadata.
 *
 * @see _caption_filter_replace().
 */
function theme_edit_captioned_image($variables) {
  $image   = $variables['image'];
  $caption = $variables['caption'];
  $align   = $variables['align'];
  $width   = $variables['width'];
  return '<div class="caption caption-'. $align .'"><div class="caption-inner" style="width: '. $width .';">'. $image . $caption .'</div></div>';
}

/**
 * @} End of "ingroup themeable".
 */
