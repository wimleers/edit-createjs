//    VIE DOM parsing service for Spark Edit
(function () {

  VIE.prototype.SparkEditService = function (options) {
    var defaults = {
      name: 'edit',
      subjectSelector: '.edit-field.edit-allowed'
    };
    this.options = _.extend({}, defaults, options);

    this.views = [];
    this.vie = null;
    this.name = this.options.name;
  };

  VIE.prototype.SparkEditService.prototype = {
    load: function (loadable) {
      var correct = loadable instanceof this.vie.Loadable;
      if (!correct) {
        throw new Error('Invalid Loadable passed');
      }

      var element;
      if (!loadable.options.element) {
        if (typeof document === 'undefined') {
          return loadable.resolve([]);
        } else {
          element = Drupal.settings.edit.context;
        }
      } else {
        element = loadable.options.element;
      }

      var entities = this.readEntities(element);
      loadable.resolve(entities);
    },

    // The edit-id data attribute contains the full identifier of
    // each entity element in format `<nodetype>:<id>:<fieldname>`.
    _getID: function (element) {
      var id = jQuery(element).data('edit-id');
      if (!id) {
        id = jQuery(element).closest('[data-edit-id]').data('edit-id');
      }
      return id;
    },

    // Returns the "URI" of an entity of an element in format 
    // `<NodeType>:<id>`.
    getElementSubject: function (element) {
      return this._getID(element).split(':').slice(0, 2).join(':');
    },

    // Returns the field name for an element.
    getElementPredicate: function (element) {
      if (!this._getID(element)) {
        debugger;
      }
      return this._getID(element).split(':').pop();
    },

    getElementType: function (element) {
      return this._getID(element).split(':').slice(0, 1);
    },

    // Reads all editable entities (_Fields_ in Spark Edit lingo) from DOM
    // and returns the VIE enties it found.
    readEntities: function (element) {
      var service = this;
      var entities = [];
      var entityElements = jQuery(this.options.subjectSelector, element);
      entityElements = entityElements.add(jQuery(element).filter(this.options.subjectSelector));
      entityElements.each(function () {
        var entity = service._readEntity(jQuery(this));
        if (entity) {
          entities.push(entity);
        }
      });
      return entities;
    },

    // Returns a filled VIE Entity instance for a DOM element. The Entity
    // is also registered in the VIE entities collection.
    _readEntity: function (element) {
      var subject = this.getElementSubject(element);
      var type = this.getElementType(element);
      var entity = this._readEntityPredicates(subject, element, false);
      if (jQuery.isEmptyObject(entity)) {
        return null;
      }
      entity['@subject'] = subject;
      if (type) {
        entity['@type'] = type;
      }

      // Register with VIE
      var entityInstance = new this.vie.Entity(entity);
      entityInstance = this.vie.entities.addOrUpdate(entityInstance, {
        updateOptions: {
          silent: true
        }
      });

      return entityInstance;
    },

    _readEntityPredicates: function (subject, element, emptyValues) {
      var entityPredicates = {};
      var service = this;
      this.findPredicateElements(subject, element, true).each(function () {
        var predicateElement = jQuery(this);
        var predicate = service.getElementPredicate(predicateElement);
        if (!predicate) {
          return;
        }
        var value = service._readElementValue(predicateElement);
        if (value === null && !emptyValues) {
          return;
        }

        entityPredicates[predicate] = value;
      });
      return entityPredicates;
    },

    _readElementValue: function (element) {
      return jQuery.trim(element.html());
    },

    // Subject elements are the DOM elements containing a single or multiple
    // editable fields. In Spark Edit these elements are called _Fields_, 
    // and the actual DOM elements which are edited are called _Editables_.
    findSubjectElements: function (element) {
      if (!element) {
        element = Drupal.settings.edit.context;
      }
      return jQuery(this.options.subjectSelector, element);
    },

    // Predicate Elements are the actual DOM elements that users will be able
    // to edit. In regular Spark Edit they are called _Editables_.
    //
    // They are contained within Entity elements, which in Spark Edit are called
    // _Fields_.
    findPredicateElements: function (subject, element, allowNestedPredicates, stop) {
      var predicates = jQuery();

      // Form-type predicates
      predicates = predicates.add(element.filter('.edit-type-form'));

      // Direct-type predicates
      var direct = element.filter('.edit-type-direct');
      predicates = predicates.add(direct.find('.field-item'));
      // Edge case: "title" pseudofield on pages with lists of nodes.
      predicates = predicates.add(direct.filter('h2').find('a'));
      // Edge case: "title" pseudofield on node pages.
      predicates = predicates.add(direct.find('h1'));

      if (!predicates.length && !stop) {
        var parentElement = element.parent(this.options.subjectSelector);
        if (parentElement.length) {
          return this.findPredicateElements(subject, parentElement, allowNestedPredicates, true);
        }
      }

      return predicates;
    }
  };
})();
