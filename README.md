@lblod/ember-rdfa-editor-template-variables-manager-plugin
==============================================================================

Plugin responsible for managing template variables.

Installation
------------------------------------------------------------------------------

```
ember install @lblod/ember-rdfa-editor-template-variables-manager-plugin
```


Usage
------------------------------------------------------------------------------
Variables are defined in template as:

```
<div typeof="ext:Variable" resource="http://variables/1">
  <div property="ext:idInSnippet">foo</div>
  <div property="ext:intentionUri">http://person/name</div>
  <div property="ext:variableState" content="initialized">initialized</div>
</div>
<div typeof="http://www.w3.org/ns/person#Person" resource="http://a/random/uri">
  <div>
   Name:
     <span id="foo" property="http://xmlns.com/foaf/0.1/familyName" datatype="http://www.w3.org/2001/XMLSchema#string">
       John Doe
     </span>
  </div>
</div>
```
Notes:

* The variable state should be defined in template as 'intialized'. This will change to 'syncing' once this plugin starts using it.
* `<div property="ext:intentionUri">http://person/name</div>` is the variable which can occur on multiple places in document.
* You are in charge of making sure `<div property="ext:idInSnippet">foo</div>` and ` id="foo"` are in sync and unique.
* `<div property="ext:intentionUri">http://person/name</div>` can be shared across templates
* Currently, in most of the editor cases, template-plugin will make sure ID's are managed.

In host app:  styles/app.scss:
```
@import 'ember-rdfa-editor-template-variables-manager-plugin';
```


Contributing
------------------------------------------------------------------------------

### Installation

* `git clone <repository-url>`
* `cd ember-rdfa-editor-template-variables-manager-plugin`
* `npm install`

### Linting

* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
