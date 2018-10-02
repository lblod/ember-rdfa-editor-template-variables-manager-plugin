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
    if (contexts.length === 0) return [];

    //For performance, let's wait for everything to settle down. (Assumes restartable task!)
    //TODO: there is an issue with nodes removed before being processed by this plugin
    yield timeout(200);

    //if we see event was triggered by this plugin, ignore it
    if(extraInfo.find(i => i && i.who == "editor-plugins/template-variables-manager-card"))
      return [];

    let variablesBlock = this.fetchOrCreateVariablesBlock(editor);

    this.moveVariableMetaToMetaBlock(editor, variablesBlock);

    let flatVariableData = this.flatVariableInstanceData(editor);

    flatVariableData = this.cleanUpNullReferenceVariables(editor, flatVariableData);

    flatVariableData = this.syncIntializedVariables(editor, flatVariableData);

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
   * Clean up null reference variables
   * @param {Object} editor
   * @param {Array} [{variableInstance, variableMeta}]
   * @return {Array} up to date [{intentionUri, variableState, variableInstance, variableMeta}]
   */
  cleanUpNullReferenceVariables(editor, flatVariableData){
    return flatVariableData.reduce((acc, v) => {
      if(!v.variableInstance){
        editor.removeNode(v.variableMeta, [ this ]);
      }
      else{
        acc.push(v);
      }
      return acc;
    }, []);
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
               variableInstance: this.getVariableDomInstance(variable),
               variableState: this.getVariableState(variable),
               variableMeta: variable
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
    return [...domRdfaVariable.children].find(child => child.attributes.property.value === 'ext:intentionUri').attributes.content.value;
  },

  /**
   * Returns state of MetaVariableData linked to domnode
   * @param {Object} domNode
   *
   * @return {String}
   */
  getVariableState(domRdfaVariable){
    let variableStateProp = [...domRdfaVariable.children].find(child => child.attributes.property.value === 'ext:variableState');
    if(variableStateProp)
      return variableStateProp.attributes.content.value;
    return '';
  },

  /**
   * Sets state of MetaVariableData linked to domnode
   * @param {Object} domNode
   */
  setVariableState(editor, domRdfaVariable, stateName){
    let variableStateProp = [...domRdfaVariable.children].find(child => child.attributes.property.value === 'ext:variableState');
    if(variableStateProp)
      editor.replaceNodeWithHTML(variableStateProp,
                                 `<div property="ext:variableState" content="${stateName}">${stateName}</div>`,
                                 false, [ this ]);
  },

  /**
   * Returns variable dom-instance linked to MetaVariableData
   * @param {Object} domNode
   *
   * @return {Object} domNode
   */
  getVariableDomInstance(domRdfaVariable){
    let domId =  [...domRdfaVariable.children].find(child => child.attributes.property.value === 'ext:idInSnippet').attributes.content.value;
    return document.querySelectorAll(`[id='${domId}']`)[0];
  },

  /**
   * When new template is added, it might contain variableMetaData.
   * We want to move these nodes to a (dom) MetaDataBlock at the beginning of the document.
   * @param {Object} editor
   * @param {Object} domNode containing the centralized meta data block
   */
  moveVariableMetaToMetaBlock(editor, variablesBlock){
    let variables = [ ...editor.rootNode.querySelectorAll("[typeOf='ext:Variable']")];
    variables = variables.filter(node => !variablesBlock.contains(node));

    variables.forEach(v => {
      let variableHtml = v.outerHTML;
      editor.prependChildrenHTML(variablesBlock, variableHtml, false, [ this ]);
      editor.removeNode(v, [ this ]);
    });
  },

  /**
   * We want to fetch or create the metadata block in the editor-document.
   * This will containing the meta data of the variables
   * @param {Object} editor
   *
   * @return {Object} domNode containing the centralized meta data block
   */
  fetchOrCreateVariablesBlock(editor){
    let variablesBlock = [ ...editor.rootNode.querySelectorAll("[property='ext:metadata']")];
    if(variablesBlock.length > 0){
      return variablesBlock[0];
    }
    return editor.prependChildrenHTML(editor.rootNode,
                                      `<div class="ext_metadata" contenteditable="false" property="ext:metadata">
                                       &nbsp;
                                       </div>`,
                                      true, [ this ])[0];
  },


  /**
   * When new template is added, the variables arrive in a 'initialized' state.
   * This means their content should be set with what has previously set in other variables and not the other way around, i.e.
   * the empty variables update the existing variables to 'null' or whatever their initial content is
   *
   * @param {Object} editor
   * @param {Array} [{intentionUri, variableState, variableInstance, variableMeta}]
   *
   * @return {Array} update to date flatVariableData: [{intentionUri, variableState, variableInstance, variableMeta}]
   */
  syncIntializedVariables(editor, flatVariableData){
    let newVariables = flatVariableData.filter(d => d.variableState === 'initialized');

    newVariables.forEach(v => {
      let baseVariable = flatVariableData
            .find(d => d.intentionUri == v.intentionUri && d.variableState != 'initialized');
      if(baseVariable)
        this.updateVariableInstances(editor, [ v.variableInstance ], baseVariable.variableInstance);
      this.setVariableState(editor, v.variableMeta, 'syncing');
    });

    if(newVariables.length > 0)
      return this.flatVariableInstanceData(editor);

    return flatVariableData;
  }

});

RdfaEditorTemplateVariablesManagerPlugin.reopen({
  who: 'editor-plugins/template-variables-manager-card'
});
export default RdfaEditorTemplateVariablesManagerPlugin;
