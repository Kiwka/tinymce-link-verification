Link plugin for TinyMCE with url verification
===================================

This plugin helps create url modal window for adding Url as a default one with additional functionality: possibility verify url accordingly to the provided pattern and to change text label on the controllers.

Usage
-----

* Add the plugin script to the page
* Add "linkVerification" to tinymce config plugins array.
* Add needed value to the link_config object. None of the fields are required.
* If you want to skip url verification and enjoy other plugin possibilities, provide <code>''</code> in the <code>link_config.verification_pattern</code> field.
* To enjoy verification functionality verification_default should be set true, or the pattern in verification_pattern should be provided.

Installation with bower
-------
To install plugin using bower use command <code>bower install tinymce-link-verification</code>


Default values
-------

* verification_default : false,
* verification_pattern: '',
* verification_error: 'This is not a valid url',
* label_url_text: 'Url',
* ok_button_text: 'Ok',
* cancel_button_text: 'Cancel'


Example
-------

Code below represent only part of the fields needed for the full tinymce initialization. Fields that are present in the code below are used in the work of this plugin.

```javascript
tinymce.init({
  plugins: 'linkVerification',
  link_config: {
    verification_default: false,
    verification_pattern: '', // String or RegExp. Will be ignored if verification_default === true
    verification_error: 'Text for the error alert go here',
    label_url_text: 'Type url',
    ok_button_text: 'Go!',
    cancel_button_text: 'Cancel',
}});
```

Other details
-------
For the default verification the RegExp created by Diego Perini was used: https://gist.github.com/dperini/729294
