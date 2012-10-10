Spark Edit module
=================

This repository contains the version of [Spark's](http://drupal.org/project/spark) inline editing module refactored to run on the [Create.js](http://createjs.org/) stack.

Using the shared Create.js & [VIE](http://viejs.org/) codebase makes it possible to share code between CMS projects, essentially making Spark development easier and the code more maintainable. These shared JavaScript libraries are used in various projects including TYPO3, Midgard, and Symfony CMF.

For some background on this approach, refer to [Decoupling Content Management](http://decoupledcms.org/).

The work of porting existing Spark edit code to Create.js was initially undertaken by [Wim Leers](http://wimleers.com/) and [Henri Bergius](http://bergie.iki.fi/) during [DrupalCon Munich 2012](http://munich2012.drupal.org/).

## How to install.

* Download the spark distribution (currently works with 7.x-1.0-alpha6) from the [project page](http://drupal.org/project/spark).
* Replace edit.module with edit-createjs.module (cd profiles/spark/modules/contrib ; rm -rf edit/ ; git clone https://github.com/wimleers/edit-createjs.git).
* Download [Backbone](http://backbonejs.org/backbone-min.js) and [Underscore](http://documentcloud.github.com/underscore/underscore-min.js).
* Create directories sites/all/libraries/backbone/ and sites/all/libraries/underscore/. Move the minified files to the respective directories and make sure sites/all/libraries/backbone/backbone-min.js and sites/all/libraries/underscore-min.js subsequently exist.
* Install Spark (e.g. if you have drush installed $ cd {SPARK-DIRECTORY} ; drush si spark --db-url="mysql://{USER}:{PWD}@localhost/{DBNAME}").

## How does this work?

Bootstrapping:

* The entry point to the system is the `Drupal.edit.init` call
* Initialization instantiates VIE, and prepares a Backbone model to keep Spark edit state
* Initialization also loads the Create.js [storage widget](http://createjs.org/guide/#storage) to handle localStorage, restoring unsaved content etc.
* Once the dependencies have been prepared, all editable fields will be retrieved from DOM, and a VIE entity will be instantiated for each
* The DOM element and the VIE entity are given to a Backbone `EditableFieldView` instance
* The `EditableFieldView`s instantiate a Create.js [editable widget](http://createjs.org/guide/#editable) for their editable contents

Switching to edit mode:

* The Backbone `EditableFieldView`s listen to Spark edit state changes
* When switching to editing stage, they decorate the editables with borders
* The views also subscribe to mouse movements and clicks
* When mouse is over a view, that view will display its label
* When a view is clicked, the editable widget is enabled, and it will load the appropriate editor (WYSIWYG, simple contentEditable, form, etc)

Switching to view mode:

* The `EditableFieldViews` again receive the state change from Spark edit
* The views disable their UI elements, returning the DOM to the undecorated and "passive" state

## Status

Most of the code has now been ported to use VIE entities for the editable contents, Create.js editor widgets for the actual content editing, and Backbone views for rendering the UI.

There are still some lingering bugs from this port that will be resolved soon.

After that the main remaining bigger task is to move saving from direct form submissions in the views to a custom `Backbone.sync` implementation. This will make it easier to support both the forms-based Drupal 7 saving process, and the RESTful Drupal 8 API, as we can just swap the `sync` methods used.

Currently the DOM parsing depends on Spark's custom HTML5 data attributes. VIE and Create.js would support RDFa out-of-the-box, and so this would be the preferred annotation in the long run.
