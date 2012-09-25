//    VIE DOM parsing service for Spark Edit
(function () {

  VIE.prototype.SparkEditService = function (options) {
    var defaults = {
      name: 'edit'
    };
    this.options = _.extend({}, defaults, options);

    this.views = [];
    this.vie = null;
    this.name = this.options.name;
  };

  VIE.prototype.SparkEditService.prototype = {

    load: function (loadable) {
      var correct = loadable instanceof this.view.Loadable;
      if (!correct) {
        throw new Error('Invalid Loadable passed');
      }

      var element;
      if (!loadable.options.element) {
        if (typeof document === 'undefined') {
          return loadable.resolve([]);
        } else {
          element = jQuery(document);
        }
      } else {
        element = loadable.options.element;
      }

      var entities = this.readEntities(element);
      loadable.resolve(entities);
    }

  };
})();
