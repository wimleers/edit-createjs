define( [
    'aloha',
    'jquery'
], function (
    Aloha,
    jQuery
) {
    'use strict';

    new ( Aloha.AbstractRepository.extend( {
        _constructor: function () {
            this._super( 'repository' );
        },

        /**
         * initalize repository API for Drupal (look-up for link plugin)
        */
        init: function () {
            // get the current host (+ protocol) for the repository look-up path
            var host = window.location.protocol + '//' + window.location.hostname;
            if ( window.location.port ) {
                host += ':'+window.location.port;
            }

            this.repositoryUrl = host + "/alohaeditor/lookup/"; // maybe make this configurable via edit module
            this.repositoryName = "drupal/local"; // can be any other name
        },

        /**
         * Searches a repository for object items matching query
         * uses Drupal search in this case
         *
         * @param {Object} p
         * @param {Function} callback
        */
        query: function ( p, callback ) {
            /* // objectTypeFilter is not used at the moment
            if ( p.objectTypeFilter && jQuery.inArray('website', p.objectTypeFilter) == -1 ) {
                callback.call(this, []);
            } else { */
                var query = [];

                if ( p.queryString && p.queryString.length < 3 ) {
                    // query string needs to be at least 3 chars in Drupal
                    callback.call(this, []);
                } else {
                    var that = this;

                    jQuery.ajax({
                        type: "GET",
                        dataType: "json",
                        url: this.repositoryUrl + p.queryString,
                        success: function ( searchResult ) {
                            var suggestions = [];
                            
                            if ( searchResult && searchResult.length > 0 ) {
                                for (var i = 0; i < searchResult.length; i++) {
                                    if (typeof searchResult[i] != "function" && suggestions.push(new Aloha.RepositoryDocument({
                                    id: searchResult[i].u, // u: url
                                    url: searchResult[i].u,
                                    name: searchResult[i].t, // t: title
                                    weight: searchResult[i].s, // s: score
                                    repositoryId: that.repositoryName,
                                    type: "website"
                                })));}
                                callback.call(this, suggestions)
                            }
                        }
                    })
                }
            //}
        },
    }))();
});
