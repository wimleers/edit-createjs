define( [
    'aloha',
    'aloha/plugin',
    'jquery',
    'aloha/contenthandlermanager',
    'drupal/drupalcontenthandler',
    'aloha/console',
    'drupal/repository',
], function (
    Aloha,
    Plugin,
    jQuery,
    ContentHandlerManager,
    DrupalContentHandler,
    console
) {
    'use strict';

    var GENTICS = window.GENTICS,
        pluginNamespace = 'aloha-drupal';

    return Plugin.create( 'drupal', {
        /**
         * Configure the available languages
        */
        languages: [ 'en' ],

        /**
         * Default configuration
        */
        config: [ ],

        /**
         * Initialize the plugin
        */
        init: function () {
            var dataAttr, allows, elementMapping;

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

            // register DrupalContentHandler
            // @todo add data-edit-allowed-tags attribute also to the backend or adapt the DrupalContentHandler
            ContentHandlerManager.register('drupal', DrupalContentHandler);

            Aloha.bind( 'aloha-editable-activated', function( $event, params ) {
                // @todo note: this hides the tabs
                jQuery('.ui-widget-header').hide();

                dataAttr = Aloha.activeEditable.obj.closest('.edit-field').data();
                if ( dataAttr && dataAttr.editAllowedTags ) {
                    allows = dataAttr.editAllowedTags.split(',');

                    jQuery.each(elementMapping, function( element, css) {
                      if (jQuery.inArray(element, allows) == -1) {
                        jQuery('.' + css).closest('button').hide();
                      }
                    });
                }
                
                // cleanup empty groups
                jQuery.each(jQuery('.aloha-ui-component-group'), function(){
                    // check for hidden nodes and empty nodes
                    var cc = 0;
                    jQuery.each(jQuery(this).children(), function() {
                        if ( jQuery(this).css('display') == 'none' || !jQuery(this).text() ) {
                            cc++;
                        }
                    });
                    
                    if ( cc == jQuery(this).children().length ) {
                        jQuery(this).hide();
                    }
                });
            });
            
            Aloha.bind( 'aloha-editable-deactivated', function( $event, params ) {
                jQuery.each(elementMapping, function( element, css ) {
                    //window.console.log('*** element', element, css);
                    if (jQuery.inArray(element, allows) == -1) {
                      jQuery('.' + css).closest('button').show();
                    }
                });
                
                // cleanup empty groups
                jQuery.each(jQuery('.aloha-ui-component-group'), function(){
                    jQuery(this).show();
                });
            });
        }
    });
});
