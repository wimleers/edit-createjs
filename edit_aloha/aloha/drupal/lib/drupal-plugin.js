define( [
  'aloha',
  'aloha/plugin',
  'jquery',
  'aloha/contenthandlermanager',
  'drupal/drupalcontenthandler',
  'drupal/repository',
], function (
  Aloha,
  Plugin,
  $,
  ContentHandlerManager,
  DrupalContentHandler
) {
  'use strict';

  var pluginNamespace = 'aloha-drupal';

  return Plugin.create('drupal', {
    /**
     * Configure the available languages.
     */
    languages: [ 'en' ],

    /**
     * Default configuration.
     */
    config: [ ],

    /**
     * Initialize the plug-in.
     */
    init: function () {
      var elementMapping,
          allowedTags;

      elementMapping = {
          'a': 'link',
          'b': 'bold',
          'strong': 'strong',
          'i': 'italic',
          'em': 'emphasis',
          'del': 'strikethrough',
          'sub': 'subscript',
          'sup': 'superscript',
          'u': 'underline',
          's': 'strikethrough2',
          'ol': 'orderedlist',
          'ul': 'unorderedlist',
          'p': 'p',
          'pre': 'pre',
          'h1': 'h1',
          'h2': 'h2',
          'h3': 'h3',
          'h4': 'h4',
          'h5': 'h5',
          'h6': 'h6',
      };

      // Register DrupalContentHandler.
      ContentHandlerManager.register('drupal', DrupalContentHandler);

      Aloha.bind('aloha-editable-activated', function($event, params) {
        // @todo Figure out how to deal with the data-edit-allowed-tags
        // attribute on the full node form.
        var allowedTagsList = Aloha.activeEditable.obj
                              .closest('.edit-field')
                              .data('edit-allowed-tags');

        if (allowedTagsList) {
          allowedTags = allowedTagsList.split(',');

          $.each(elementMapping, function(element, className) {
            if ($.inArray(element, allowedTags) == -1) {
              $('span.ui-button-icon-primary[data-html-tag="' + className + '"]')
              .closest('button')
              .addClass('aloha-drupal-ui-state-hidden');
            }
          });
        }

        // Clean up empty component groups.
        $.each($('.aloha-ui-component-group'), function(){
          // Check for hidden nodes and empty nodes.
          var cc = 0;
          $.each($(this).children(), function() {
            if ($(this).css('display') == 'none' || !$(this).text()) {
              cc++;
            }
          });
          if (cc == jQuery(this).children().length) {
            jQuery(this).hide();
          }
        });
      });

      Aloha.bind('aloha-editable-deactivated', function($event, params) {
        $.each(elementMapping, function(element, className) {
          if ($.inArray(element, allowedTags) == -1) {
            $('span.ui-button-icon-primary[data-html-tag="' + className + '"]')
            .closest('button')
            .removeClass('aloha-drupal-ui-state-hidden');
          }
        });

        // Restore previously empty component groups.
        $.each($('.aloha-ui-component-group'), function() {
            $(this).show();
        });
      });
    }
  });
});
