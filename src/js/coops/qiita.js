const electron = require('electron');

const models = require('../models');
const Note = models.Note;
const ebg = require('../utils/ebg');

const qiitaItemsURL = 'https://qiita.com/api/v2/items';

const QIITA_TOKEN_KEY = 'coops.qiita.token';

function setQiitaToken(token) {
  return localStorage.setItem(QIITA_TOKEN_KEY, token);
}

function getQiitaToken() {
  return localStorage.getItem(QIITA_TOKEN_KEY);
}

module.exports = function(Vue, option) {
  Vue.use(require('vue-resource'));
  Vue.use(require('../components/flashmessage'));

  Vue.prototype.$qiitaAuth = function(cb, err) {
    this.$modal(
      'Apply Qiita token',
      'Get Qiita access token with read_qiita, write_qiita scope from account settings page of Qiita.',
      [{type: 'text', label: 'Access Token', placeholder: '', retValue: ''}],
      (prompts) => {
        var token = prompts[0].retValue;
        if (!(token.length > 0)) {
          this.$message('error', 'Specify correct string', 5000);
          return;
        }
        setQiitaToken(token);
        this.$message('info', 'Login Succeed');
        if (cb) {
          Vue.nextTick(cb);
        }
      })
  };
  Vue.prototype.$qiitaPost = function(note) {
    var postNote = () => {
      this.$modal(
        'Share on Qiita',
        'Title will be: ' + note.title,
        [{type: 'text', label: 'Tags', placeholder: 'tag1,tag2,tag3', retValue: ''},
          {type: 'checkbox', label: 'Tweet', retValue: true},
          {type: 'checkbox', label: 'Gist', retValue: false},
          {type: 'checkbox', label: 'Private', retValue: false}],
        (prompts) => {
          var tags = [];
          prompts[0].retValue.split(',').forEach((t) => {
            if (t.length > 0) {
              tags.push({name: t});
            }
          });
          if (tags.length == 0) {
            this.$message('error', 'Qiita requires at least one tag :-|', 5000);
            return
          }
          var payload = {
            title: note.title,
            body: note.bodyWithDataURL + '\n\nWrote by [PileMd](https://pilemd.com/)',
            tweet: prompts[1].retValue,
            gist: prompts[2].retValue,
            coediting: false,
            tags: prompts[0].retValue.split(',').map((t) => {return {name: t}}),
            'private': prompts[3].retValue
          };
          var token = getQiitaToken();
          this.$http.post(
            qiitaItemsURL, payload, undefined,
            {headers: {'Authorization': 'Bearer ' + token}}).then(
            (res) => {
              // Success
              var url = res.data.url;
              note.qiitaURL = url;
              Note.setModel(note);
              this.$message('info', 'Posted to Qiita (Click to open)', 5000, url);
            },
            (res) => {
              // Error
              this.$message('error', 'Sorry. Error ' +
                res.status + ' ' + res.data.message, 5000)
            }
          )
        }
      );
    };
    var token = getQiitaToken();
    if (!token) {
      Vue.prototype.$qiitaAuth.call(this, postNote);
    } else {
      postNote();
    }
  };
};
