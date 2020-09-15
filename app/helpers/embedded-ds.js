import { helper } from '@ember/component/helper';
import $ from 'jquery';
import ENV from '../config/environment';

let {settingFile, wayfScript}  = ENV.dsconfig;

/**
 * embeddedDs helper.
 * settingFile embeddedDS cofing file
 * wayfScript embeddedDS Script file
 *
 * @class embeddedDs
 * @param {String} parentId embeddedDS will be drawn to child element of this ID.
 */
export function embeddedDs(parentId) {
  let language = (window.navigator.languages && window.navigator.languages[0]) ||
    window.navigator.language ||
    window.navigator.userLanguage ||
    window.navigator.browserLanguage;
  if (!['ja', 'en'].includes(language)) {
    language = 'ja';
  }
  let dsTag = $('<div />', {id: 'dsTag'})
  let setup = $('<script />', {
      src: settingFile,
      type: 'application/javascript'
    }
  );
  let script = $('<script />', {
      src: wayfScript + '.' + language,
      type: 'application/javascript'
    }
  );

  $('#' + parentId).append(dsTag);
  $('#' + parentId).append(setup);
  $('#' + parentId).append(script);

  if (typeof(additionalHtml) != "undefined") {
    $('#' + parentId).append(additionalHtml);
  }
}

export default helper(embeddedDs);
