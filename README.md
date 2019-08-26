@lblod/ember-rdfa-editor-template-variables-manager-plugin
==============================================================================

Plugin responsible for managing template variables.
When the value of a variable changes in the document, this plugin makes sure the value is propagated to the other variable instances in the document.

Compatibility
------------------------------------------------------------------------------

* Ember.js v2.18 or above
* Ember CLI v2.13 or above
* Node.js v8 or above


Installation
------------------------------------------------------------------------------

```
ember install @lblod/ember-rdfa-editor-template-variables-manager-plugin
```


Usage
------------------------------------------------------------------------------
Variables need to defined in the template with following context:

```
<div class="ext_variable" typeof="ext:Variable" resource="http://variables/1">
  <div property="ext:idInSnippet" content="foo">foo</div>
  <div property="ext:intentionUri" content="http://person/name">http://person/name</div>
  <div property="ext:variableState" content="initialized">initialized</div>
</div>
<div typeof="http://www.w3.org/ns/person#Person" resource="http://a/random/uri">
  <div>
   Name:
     <div id="foo" property="ext:variableInstanceContainer">
       <span property="http://xmlns.com/foaf/0.1/familyName" datatype="http://www.w3.org/2001/XMLSchema#string">
         John Doe
       </span>
     </div>
  </div>
  </div>
```
Notes:

* The variable state should be defined in template as 'initialized'. This will change to 'syncing' once this plugin starts using it.
* You are in charge of making sure `<div property="ext:idInSnippet" content="foo">foo</div>` and ` id="foo"` are in sync and unique.
  *  If you use the [ember-rdfa-editor-standard-template-plugin](https://github.com/lblod/ember-rdfa-editor-standard-template-plugin), it will make sure ID's are managed with `{generateUuid()}` or `${generateBoundUuid('variable-instance-1')}`. As a result, the snippet might look like:
```
<div class="ext_variable" typeof="ext:Variable" resource="http://variables/1">
<div property="ext:idInSnippet" content="${generateBoundUuid('variable-instance-1')}">${generateBoundUuid('variable-instance-1')}</div>
   <!-- remaining properties -->
   Name:
     <div id="${generateBoundUuid('variable-instance-1')}" property="ext:variableInstanceContainer">
       <span property="http://xmlns.com/foaf/0.1/familyName" datatype="http://www.w3.org/2001/XMLSchema#string">
         John Doe
       </span>
     </div>
  </div>
  </div>
```
* `<div property="ext:intentionUri" content="http://person/name">http://person/name</div>` is the 'logical' reference of the variable and can be shared accross multiple templates.
* `class="ext_variable"` is optional, but makes your variables invisible.

In host app:  styles/app.scss:
```
@import 'ember-rdfa-editor-template-variables-manager-plugin';
```

A more realistic example and some explanations
------------------------------------------------------------------------------
Suppose there is a document with 2 instances of the variable `http://person/name`:

```
<div class="ext_variable" typeof="ext:Variable" resource="http://variables/a/random-uri/1">
  <div property="ext:idInSnippet" content="instance-1-of-person-name-variable">instance-1-of-person-name-variable</div>
  <div property="ext:intentionUri" content="http://person/name">http://person/name</div>
  <div property="ext:variableState" content="initialized">initialized</div>
</div>
<div typeof="http://www.w3.org/ns/person#Person" resource="http://person/random/uri/1">
  <div>
   Name:
     <div id="instance-1-of-person-name-variable" property="ext:variableInstanceContainer">
       <span property="http://xmlns.com/foaf/0.1/familyName" datatype="http://www.w3.org/2001/XMLSchema#string">
         John Doe
       </span>
     </div>
  </div>
  </div>


  <!-- Remaining text in the template -->

  <div class="ext_variable" typeof="ext:Variable" resource="http://variables/a/random-uri/2">
  <div property="ext:idInSnippet" content="instance-2-of-person-name-variable">instance-2-of-person-name-variable</div>
  <div property="ext:intentionUri" content="http://person/name">http://person/name</div>
  <div property="ext:variableState" content="initialized">initialized</div>
</div>
<div typeof="http://www.w3.org/ns/person#Person" resource="http://person/random/uri/1">
  <div>
   Name:
     <div id="instance-2-of-person-name-variable" property="ext:variableInstanceContainer">
       <span property="http://xmlns.com/foaf/0.1/familyName" datatype="http://www.w3.org/2001/XMLSchema#string">
         John Doe
       </span>
     </div>
  </div>
  </div>
```
When the name of `John Doe` is changed in `<div id="instance-2-of-person-name-variable" ...` to `John Foo`, the plugin will be notified and will look for all instances of the variable with `ext:intentionUri` `http://person/name` and update the variable accordingly. The end state will thus look like: 
```
<div class="ext_variable" typeof="ext:Variable" resource="http://variables/a/random-uri/1">
  <div property="ext:idInSnippet" content="instance-1-of-person-name-variable">instance-1-of-person-name-variable</div>
  <div property="ext:intentionUri" content="http://person/name">http://person/name</div>
  <div property="ext:variableState" content="syncing">syncing</div>
</div>
<div typeof="http://www.w3.org/ns/person#Person" resource="http://person/random/uri/1">
  <div>
   Name:
     <div id="instance-1-of-person-name-variable" property="ext:variableInstanceContainer">
       <span property="http://xmlns.com/foaf/0.1/familyName" datatype="http://www.w3.org/2001/XMLSchema#string">
         John Foo
       </span>
     </div>
  </div>
  </div>


  <!-- Remaining text in the template -->

  <div class="ext_variable" typeof="ext:Variable" resource="http://variables/a/random-uri/2">
  <div property="ext:idInSnippet" content="instance-2-of-person-name-variable">instance-2-of-person-name-variable</div>
  <div property="ext:intentionUri" content="http://person/name">http://person/name</div>
  <div property="ext:variableState" content="syncing">syncing</div>
</div>
<div typeof="http://www.w3.org/ns/person#Person" resource="http://person/random/uri/1">
  <div>
   Name:
     <div id="instance-2-of-person-name-variable" property="ext:variableInstanceContainer">
       <span property="http://xmlns.com/foaf/0.1/familyName" datatype="http://www.w3.org/2001/XMLSchema#string">
         John Foo
       </span>
     </div>
  </div>
  </div>
```


Contributing
------------------------------------------------------------------------------

### Installation

* `git clone <repository-url>`
* `cd ember-rdfa-editor-template-variables-manager-plugin`
* `npm install`

### Linting

* `npm run lint:hbs`
* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
