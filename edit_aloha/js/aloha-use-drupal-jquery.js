// Based on Aloha Editor's aloha-jquery-noconflict.js, but:
// - with a bugfix (first line);
// - no longer removing jQuery from the global scope;
// - the compiled/packaged versions of Aloha Editor *always* call Aloha._load(),
//   even when they should not, i.e. when data-aloha-defer-init="true" is set.
var Aloha = Aloha || {};
Aloha.settings = Aloha.settings || {};
Aloha.settings.jQuery = Aloha.settings.jQuery || jQuery.noConflict();
Aloha._load = function() {};
