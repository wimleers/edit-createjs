(function($) {

/**
 * @file ui.js
 *
 * "Global" UI components: toggle, modal.
 */

Drupal.edit = Drupal.edit || {};


Drupal.edit.toggle = {
  render: function() {
    // TODO: fancy, "physical toggle" to switch from view to edit mode and back.
  }
};


Drupal.edit.modal = {
  create: function(message, actions, $editable) {
    // The modal should be the only interaction element now.
    $editable.addClass('edit-belowoverlay');
    Drupal.edit.toolbar.get($editable).addClass('edit-belowoverlay');

    $(Drupal.theme('editModal', {}))
    .appendTo('body')
    .find('.main p').text(message).end()
    .find('.actions').append($(actions))
    .delegate('a.discard', 'click.edit', function() {
      // Restore to original state.
      $editable.html($editable.data('edit-content-original'));
      $editable.data('edit-content-changed', false);

      Drupal.edit.modal.remove();
      Drupal.edit.toolbar.get($editable).find('a.close').trigger('click.edit');
    })
    .delegate('a.save', 'click.edit', function() {
      Drupal.edit.modal.remove();
      Drupal.edit.toolbar.get($editable).find('a.save').trigger('click.edit');
    });
  },

  get: function() {
    return $('#edit-modal');
  },

  remove: function() {
    Drupal.edit.modal.get().remove();

    // The modal's HTML was removed, hence no need to undelegate it.

    // Make the other interaction elements available again.
    $('.edit-belowoverlay').removeClass('edit-belowoverlay');
  }
};

})(jQuery);
