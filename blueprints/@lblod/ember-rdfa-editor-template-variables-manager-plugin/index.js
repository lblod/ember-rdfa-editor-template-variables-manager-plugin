/* eslint-env node */
const existsSync = require('exists-sync');

const profilesFile = 'app/config/editor-profiles.js';

module.exports = {
  description: 'Adds the plugin to the default and all editor-profiles',

  normalizeEntityName() { },

  insertPluginNameAtKey( key, pluginName, afterContents="" ){
    return this.insertIntoFile(
      profilesFile,
      `    "${pluginName}",${afterContents}`,
      { after: `  ${key}: [\n` });
  },

  async afterInstall(options) {
    const pluginName = options.originBlueprintName.slice('@lblod/ember-'.length);

    if( existsSync(profilesFile) ){
      try {
        await this.insertPluginNameAtKey("all", pluginName);
        await this.insertPluginNameAtKey("default", pluginName, " "); /* the extra space here,
                                                                         makes the line different
                                                                         from the inserted line
                                                                         above.  This is makes
                                                                         insertIntoFile consider
                                                                         the lines to be different,
                                                                         and hence insert the
                                                                         contents.  Sorry for the
                                                                         somewhat uglier generated
                                                                         files. */
      } catch (err) {
        throw 'Failed to insert all contents ' + err;
      }
    } else {
      throw 'Could not insert into "all" profile';
    }
    return;
  }
};
