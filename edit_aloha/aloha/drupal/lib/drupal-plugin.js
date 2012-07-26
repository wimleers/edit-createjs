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
          'a': 'aloha-icon-link',
          'b': 'aloha-icon-bold',
          'strong': 'aloha-icon-strong',
          'i': 'aloha-icon-italic',
          'em': 'aloha-icon-emphasis',
          'del': 'aloha-icon-strikethrough',
          'sub': 'aloha-icon-subscript',
          'sup': 'aloha-icon-superscript',
          'u': 'aloha-icon-underline',
          's': 'aloha-icon-strikethrough2',
          'ol': 'aloha-icon-orderedlist',
          'ul': 'aloha-icon-unorderedlist',
          'p': 'aloha-large-icon-p',
          'pre': 'aloha-large-icon-pre',
          'h1': 'aloha-large-icon-h1',
          'h2': 'aloha-large-icon-h2',
          'h3': 'aloha-large-icon-h3',
          'h4': 'aloha-large-icon-h4',
          'h5': 'aloha-large-icon-h5',
          'h6': 'aloha-large-icon-h6',
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
              $('.' + className).closest('button').hide();
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
            $('.' + className).closest('button').show();
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
