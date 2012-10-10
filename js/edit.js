(function ($) {

Drupal.edit = Drupal.edit || {};
Drupal.edit.wysiwyg = Drupal.edit.wysiwyg || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    $('#edit_view-edit-toggles').once('edit-init', Drupal.edit.init);
    $('#edit_view-edit-toggles').once('edit-toggle', Drupal.edit.toggle.render);
  }
};

Drupal.edit.const = {};
Drupal.edit.const.transitionEnd = "transitionEnd.edit webkitTransitionEnd.edit transitionend.edit msTransitionEnd.edit oTransitionEnd.edit";

Drupal.edit.init = function() {
  // VIE instance for Editing
  Drupal.edit.vie = new VIE();
  // Use our custom DOM parsing service until RDFa is available
  Drupal.edit.vie.use(new Drupal.edit.vie.SparkEditService());
  Drupal.edit.domService = Drupal.edit.vie.service('edit');

  Drupal.edit.state = Drupal.edit.prepareStateModel();
  Drupal.edit.state.set('queues', Drupal.edit.prepareQueues());

  // Load the storage widget to get localStorage support
  $('body').midgardStorage({
    vie: Drupal.edit.vie,
    editableNs: 'createeditable'
  });
  // TODO: Check localStorage for unsaved changes
  // $('body').midgardStorage('checkRestore');

  // Initialize WYSIWYG, if any.
  if (Drupal.settings.edit.wysiwyg) {
    $(document).bind('edit-wysiwyg-ready.edit', function() {
      Drupal.edit.state.set('wysiwygReady', true);
      console.log('edit: WYSIWYG ready');
    });
    Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].init();
  }

  // Create a backstage area.
  $(Drupal.theme('editBackstage', {})).appendTo('body');

  // Instantiate FieldViews
  Drupal.edit.domService.findSubjectElements().each(Drupal.edit.prepareFieldView);

  // Instantiate overlayview
  var overlayView = new Drupal.edit.views.OverlayView({
    state: Drupal.edit.state
  });

  // Transition between view/edit states.
  $("a.edit_view-edit-toggle").bind('click.edit', function(event) {
    event.preventDefault();

    var isViewing = $(this).hasClass('edit-view');
    Drupal.edit.state.set('isViewing', isViewing);

    // swap active class among the two links.
    $('a.edit_view-edit-toggle').removeClass('active');
    $('a.edit_view-edit-toggle').parent().removeClass('active');
    $('a.edit_view-edit-toggle.edit-' + (isViewing ? 'view' : 'edit')).addClass('active');
    $('a.edit_view-edit-toggle.edit-' + (isViewing ? 'view' : 'edit')).parent().addClass('active');
  });
};

Drupal.edit.prepareStateModel = function () {
  // The state of Spark Edit is handled in a Backbone model
  Drupal.edit.StateModel = Backbone.Model.extend({
    defaults: {
      isViewing: true,
      entityBeingHighlighted: [],
      fieldBeingHighlighted: [],
      fieldBeingEdited: [],
      highlightedEditable: null,
      editedEditable: null,
      editedFieldView: null,
      queues: {},
      wysiwygReady: false
    }
  });

  // We always begin in view mode.
  return new Drupal.edit.StateModel();
};

Drupal.edit.prepareQueues = function () {
  // Form preloader.

  var queues = {
    preload: Drupal.edit.domService.findSubjectElements().filter('.edit-type-form').map(function () {
      return Drupal.edit.util.getID($(this));
    })
  };
  console.log('Fields with (server-generated) forms:', queues.preload);
  return queues;
};

Drupal.edit.prepareFieldView = function () {
  var element = jQuery(this);
  var fieldViewType = Drupal.edit.views.EditableFieldView;
  if (!element.hasClass('edit-type-direct')) {
    fieldViewType = Drupal.edit.views.FormEditableFieldView;
  }

  Drupal.edit.vie.load({
    element: element
  }).using('edit').execute().done(function (entities) {
    var subject = Drupal.edit.domService.getElementSubject(element);
    var predicate = Drupal.edit.domService.getElementPredicate(element);
    var entity = entities[0];
    if (!entity) {
      return;
    }

    var fieldView = new fieldViewType({
      state: Drupal.edit.state,
      el: element,
      model: entity,
      predicate: predicate,
      vie: Drupal.edit.vie
    });
  });
};

// Field editables.
Drupal.edit.editables = {
  _loadForm: function($editable, $field) {
    var edit_id = Drupal.edit.util.getID($field);
    var element_settings = {
      url      : Drupal.edit.util.calcFormURLForField(edit_id),
      event    : 'edit-internal.edit',
      $field   : $field,
      $editable: $editable,
      submit   : { nocssjs : ($field.hasClass('edit-type-direct')) },
      progress : { type : null }, // No progress indicator.
    };
    if (Drupal.ajax.hasOwnProperty(edit_id)) {
      delete Drupal.ajax[edit_id];
      $editable.unbind('edit-internal.edit');
    }
    Drupal.ajax[edit_id] = new Drupal.ajax(edit_id, $editable, element_settings);
    $editable.trigger('edit-internal.edit');
  }
};


})(jQuery);

$ = jQuery;
