import Service from '@ember/service';
import { task, timeout } from 'ember-concurrency';
import { isArray } from '@ember/array';

/**
 * Service responsible for managing variables in templates.
 * General implementation notes:
 * - This plugin will make sure there is a meta data block in the document. Where all variable metadata will be moved.
 * - This block is not contenteditable and invisible.
 * - Flow is: look for new variables, move them to block, if new sync them with exisiting variables, update them with newest content.
 *
 * @module editor-template-variables-manager-plugin
 * @class RdfaEditorTemplateVariablesManagerPlugin
 * @constructor
 * @extends EmberService
 */
const RdfaEditorTemplateVariablesManagerPlugin = Service.extend({

  init(){
    this._super(...arguments);
  },

  /**
   * Restartable task to handle the incoming events from the editor dispatcher
   *
   * @method execute
   *
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Array} contexts RDFa contexts of the text snippets the event applies on
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   * @param {Array} Extra info (optional)
   *
   * @public
   */
  execute: task(function * (hrId, contexts, hintsRegistry, editor, extraInfo = []) {
    //TODO: avoid memory leak, manage store better
    if (contexts.length === 0) return [];

    //For performance, let's wait for everything to settle down. (Assumes restartable task!)
    yield timeout(200);

    //if we see event was triggered by this plugin, ignore it
    if(extraInfo.find(i => i && i.who == "editor-plugins/template-variables-manager-card"))
      return [];

    let flatVariableData = this.flatVariableInstanceData(editor);

    contexts.forEach((context) => {
      let richNodes = isArray(context.richNode)? context.richNode : [ context.richNode ];

      richNodes.filter(richN => richN.domNode).forEach(richNode => {
        let variableData = this.findDomVariableInstanceForchangedNode(flatVariableData, richNode.domNode);

        if(variableData && editor.rootNode.contains(editor.currentNode)){

          let variablesToUpdate = flatVariableData
                .filter(d => d.intentionUri == variableData.intentionUri)
                .map(d => d.variableInstance);

          this.updateVariableInstances(editor, variablesToUpdate, variableData.variableInstance);
        }
      });
    });

  }).restartable(),

  /**
   * Given changed node, find variable instance it belongs to.
   * @param {Array} [{variableInstance: DomNode}]
   * @param {Object} DomNode
   */
  findDomVariableInstanceForchangedNode(variableInstances, changedNode){
    return variableInstances.find(v => v.variableInstance.contains(changedNode));
  },

  /**
   * Given updated node, update other variable instances.
   * @param {Object} editor
   * @param {Array} [ DomNode ]
   * @param {Object} DomNode with 'ground truth'
   */
  updateVariableInstances(editor, variablesToUpdate, updatedNode){
    if(variablesToUpdate.length == 0){
      return [];
    }

    let nodeToUpdate = variablesToUpdate[0];

    if(!nodeToUpdate.isSameNode(updatedNode)){
      this.updateVariableInstance(editor, updatedNode, nodeToUpdate);
    }

    return this.updateVariableInstances(editor, variablesToUpdate.slice(1), updatedNode);
  },

  /**
   * Given updated node content with updated Node
   * @param {Object} editor
   * @param {Array} DomNode
   * @param {Object} DomNode with 'ground truth'
   */
  updateVariableInstance(editor, updatedNode, nodeToUpdate){
    //TODO: delete old node
    let newNode = updatedNode.cloneNode(true);
    newNode.id = nodeToUpdate.id;
    nodeToUpdate.removeAttribute("id"); //makes sure no duplicate id's
    editor.replaceNodeWithHTML(nodeToUpdate, newNode.outerHTML, false, [ this ]);
  },

  /**
   * Find all variableInstances and return as list together with some meta data
   * @param {Object} editor
   *
   * @return {Array} [{intentionUri, variableInstance, variabelState, variableMeta}]
   */
  flatVariableInstanceData(editor){
    let variables = [ ...editor.rootNode.querySelectorAll("[typeOf='ext:Variable']")];
    return variables.map( variable => {
      return { intentionUri : this.getIntentionUri(variable),
               variableInstance: this.getVariableDomInstance(variable)
             };
    });
  },

  /**
   * Returns intention-uri of MetaVariableData linked to domnode
   * @param {Object} domNode
   *
   * @return {String}
   */
  getIntentionUri(domRdfaVariable){
    return [...domRdfaVariable.children].find(child => child.attributes.property.value === 'ext:intentionUri').innerText;
  },

  getVariableDomInstance(domRdfaVariable){
    let domId =  [...domRdfaVariable.children].find(child => child.attributes.property.value === 'ext:idInSnippet').innerText;
    return document.querySelectorAll(`[id='${domId}']`)[0];
  }

});

RdfaEditorTemplateVariablesManagerPlugin.reopen({
  who: 'editor-plugins/template-variables-manager-card'
});
export default RdfaEditorTemplateVariablesManagerPlugin;
