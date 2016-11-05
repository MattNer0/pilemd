/**
 * Module to render HTML for preview
 */

const marked = require('marked');
const _ = require('lodash');
const highlightjs = require('highlight.js/lib/highlight');

const Image = require('./models').Image;

highlightjs.registerLanguage('accesslog', require('highlight.js/lib/languages/accesslog'));
highlightjs.registerLanguage('actionscript', require('highlight.js/lib/languages/actionscript'));
highlightjs.registerLanguage('apache', require('highlight.js/lib/languages/apache'));
highlightjs.registerLanguage('applescript', require('highlight.js/lib/languages/applescript'));
highlightjs.registerLanguage('arduino', require('highlight.js/lib/languages/arduino'));
highlightjs.registerLanguage('xml', require('highlight.js/lib/languages/xml'));
highlightjs.registerLanguage('asciidoc', require('highlight.js/lib/languages/asciidoc'));
highlightjs.registerLanguage('autohotkey', require('highlight.js/lib/languages/autohotkey'));
highlightjs.registerLanguage('bash', require('highlight.js/lib/languages/bash'));
highlightjs.registerLanguage('basic', require('highlight.js/lib/languages/basic'));
highlightjs.registerLanguage('brainfuck', require('highlight.js/lib/languages/brainfuck'));
highlightjs.registerLanguage('clojure', require('highlight.js/lib/languages/clojure'));
highlightjs.registerLanguage('clojure-repl', require('highlight.js/lib/languages/clojure-repl'));
highlightjs.registerLanguage('cmake', require('highlight.js/lib/languages/cmake'));
highlightjs.registerLanguage('coffeescript', require('highlight.js/lib/languages/coffeescript'));
highlightjs.registerLanguage('cos', require('highlight.js/lib/languages/cos'));
highlightjs.registerLanguage('cpp', require('highlight.js/lib/languages/cpp'));
highlightjs.registerLanguage('cs', require('highlight.js/lib/languages/cs'));
highlightjs.registerLanguage('csp', require('highlight.js/lib/languages/csp'));
highlightjs.registerLanguage('css', require('highlight.js/lib/languages/css'));
highlightjs.registerLanguage('d', require('highlight.js/lib/languages/d'));
highlightjs.registerLanguage('markdown', require('highlight.js/lib/languages/markdown'));
highlightjs.registerLanguage('delphi', require('highlight.js/lib/languages/delphi'));
highlightjs.registerLanguage('diff', require('highlight.js/lib/languages/diff'));
highlightjs.registerLanguage('django', require('highlight.js/lib/languages/django'));
highlightjs.registerLanguage('dns', require('highlight.js/lib/languages/dns'));
highlightjs.registerLanguage('dockerfile', require('highlight.js/lib/languages/dockerfile'));
highlightjs.registerLanguage('dos', require('highlight.js/lib/languages/dos'));
highlightjs.registerLanguage('elixir', require('highlight.js/lib/languages/elixir'));
highlightjs.registerLanguage('ruby', require('highlight.js/lib/languages/ruby'));
highlightjs.registerLanguage('erb', require('highlight.js/lib/languages/erb'));
highlightjs.registerLanguage('erlang-repl', require('highlight.js/lib/languages/erlang-repl'));
highlightjs.registerLanguage('erlang', require('highlight.js/lib/languages/erlang'));
highlightjs.registerLanguage('fix', require('highlight.js/lib/languages/fix'));
highlightjs.registerLanguage('fsharp', require('highlight.js/lib/languages/fsharp'));
highlightjs.registerLanguage('go', require('highlight.js/lib/languages/go'));
highlightjs.registerLanguage('groovy', require('highlight.js/lib/languages/groovy'));
highlightjs.registerLanguage('haml', require('highlight.js/lib/languages/haml'));
highlightjs.registerLanguage('handlebars', require('highlight.js/lib/languages/handlebars'));
highlightjs.registerLanguage('haskell', require('highlight.js/lib/languages/haskell'));
highlightjs.registerLanguage('haxe', require('highlight.js/lib/languages/haxe'));
highlightjs.registerLanguage('hsp', require('highlight.js/lib/languages/hsp'));
highlightjs.registerLanguage('htmlbars', require('highlight.js/lib/languages/htmlbars'));
highlightjs.registerLanguage('http', require('highlight.js/lib/languages/http'));
highlightjs.registerLanguage('ini', require('highlight.js/lib/languages/ini'));
highlightjs.registerLanguage('java', require('highlight.js/lib/languages/java'));
highlightjs.registerLanguage('javascript', require('highlight.js/lib/languages/javascript'));
highlightjs.registerLanguage('json', require('highlight.js/lib/languages/json'));
highlightjs.registerLanguage('julia', require('highlight.js/lib/languages/julia'));
highlightjs.registerLanguage('kotlin', require('highlight.js/lib/languages/kotlin'));
highlightjs.registerLanguage('less', require('highlight.js/lib/languages/less'));
highlightjs.registerLanguage('lisp', require('highlight.js/lib/languages/lisp'));
highlightjs.registerLanguage('lua', require('highlight.js/lib/languages/lua'));
highlightjs.registerLanguage('makefile', require('highlight.js/lib/languages/makefile'));
highlightjs.registerLanguage('mathematica', require('highlight.js/lib/languages/mathematica'));
highlightjs.registerLanguage('matlab', require('highlight.js/lib/languages/matlab'));
highlightjs.registerLanguage('maxima', require('highlight.js/lib/languages/maxima'));
highlightjs.registerLanguage('perl', require('highlight.js/lib/languages/perl'));
highlightjs.registerLanguage('nginx', require('highlight.js/lib/languages/nginx'));
highlightjs.registerLanguage('objectivec', require('highlight.js/lib/languages/objectivec'));
highlightjs.registerLanguage('ocaml', require('highlight.js/lib/languages/ocaml'));
highlightjs.registerLanguage('php', require('highlight.js/lib/languages/php'));
highlightjs.registerLanguage('powershell', require('highlight.js/lib/languages/powershell'));
highlightjs.registerLanguage('prolog', require('highlight.js/lib/languages/prolog'));
highlightjs.registerLanguage('python', require('highlight.js/lib/languages/python'));
highlightjs.registerLanguage('q', require('highlight.js/lib/languages/q'));
highlightjs.registerLanguage('qml', require('highlight.js/lib/languages/qml'));
highlightjs.registerLanguage('r', require('highlight.js/lib/languages/r'));
highlightjs.registerLanguage('rib', require('highlight.js/lib/languages/rib'));
highlightjs.registerLanguage('rsl', require('highlight.js/lib/languages/rsl'));
highlightjs.registerLanguage('rust', require('highlight.js/lib/languages/rust'));
highlightjs.registerLanguage('scala', require('highlight.js/lib/languages/scala'));
highlightjs.registerLanguage('scheme', require('highlight.js/lib/languages/scheme'));
highlightjs.registerLanguage('scilab', require('highlight.js/lib/languages/scilab'));
highlightjs.registerLanguage('scss', require('highlight.js/lib/languages/scss'));
highlightjs.registerLanguage('smalltalk', require('highlight.js/lib/languages/smalltalk'));
highlightjs.registerLanguage('sml', require('highlight.js/lib/languages/sml'));
highlightjs.registerLanguage('sqf', require('highlight.js/lib/languages/sqf'));
highlightjs.registerLanguage('sql', require('highlight.js/lib/languages/sql'));
highlightjs.registerLanguage('stan', require('highlight.js/lib/languages/stan'));
highlightjs.registerLanguage('stylus', require('highlight.js/lib/languages/stylus'));
highlightjs.registerLanguage('swift', require('highlight.js/lib/languages/swift'));
highlightjs.registerLanguage('tex', require('highlight.js/lib/languages/tex'));
highlightjs.registerLanguage('tp', require('highlight.js/lib/languages/tp'));
highlightjs.registerLanguage('twig', require('highlight.js/lib/languages/twig'));
highlightjs.registerLanguage('typescript', require('highlight.js/lib/languages/typescript'));
highlightjs.registerLanguage('vala', require('highlight.js/lib/languages/vala'));
highlightjs.registerLanguage('vbnet', require('highlight.js/lib/languages/vbnet'));
highlightjs.registerLanguage('vbscript', require('highlight.js/lib/languages/vbscript'));
highlightjs.registerLanguage('vbscript-html', require('highlight.js/lib/languages/vbscript-html'));
highlightjs.registerLanguage('vhdl', require('highlight.js/lib/languages/vhdl'));
highlightjs.registerLanguage('vim', require('highlight.js/lib/languages/vim'));
highlightjs.registerLanguage('x86asm', require('highlight.js/lib/languages/x86asm'));
highlightjs.registerLanguage('xl', require('highlight.js/lib/languages/xl'));
highlightjs.registerLanguage('xquery', require('highlight.js/lib/languages/xquery'));
highlightjs.registerLanguage('yaml', require('highlight.js/lib/languages/yaml'));

// Settings for Markdown
// Injecting GFM task lists
var renderer = new marked.Renderer();

renderer.listitem = function(text) {
  if (/^\s*\[[x ]\]\s*/.test(text)) {
    var matched = /^(.*?)(<|$)/.exec(text)[1];
    text = text
      .replace(/^\s*\[ \]\s*/, '<span><input class="my-el-todo-list" data-value="' + matched + '" type="checkbox" /></span> ')
      .replace(/^\s*\[x\]\s*/, '<span><input class="my-el-todo-list" data-value="' + matched + '" type="checkbox" checked /></span> ');

    return '<li class="checkbox" style="list-style: none"><label>' + text + '</label></li>';
  } else {
    return '<li>' + text + '</li>';
  }
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  highlight: function (code) {
    return '<div class="hljs">' + highlightjs.highlightAuto(code).value + '</div>';
  }
});

const ATAG_TO_EXTERNAL_TEMP = _.template(
  '<a href="<%- link %>" ' +
  'onclick="require(\'electron\').shell.openExternal(\'<%- link %>\'); ' +
  'return false;"' +
  'oncontextmenu="var remote = new require(\'electron\').remote; ' +
  'var Menu = remote.Menu;' +
  'var MenuItem = remote.MenuItem;' +
  'var m = new Menu();' +
  'm.append(new MenuItem({label: \'Copy Link\',' +
  'click: function() {require(\'electron\').clipboard.writeText(\'<%- link %>\')}}));' +
  'm.popup(remote.getCurrentWindow()); return false;"' +
  '><%- text %></a>'
);

function replaceAtagToExternal(bodyHTML) {
  return bodyHTML.replace(
    /<a.*?href="(https?:\/\/.*?)".*?>(.*?)<\/a>/mg,
    (match, p1, p2, offset, string) => {
      return ATAG_TO_EXTERNAL_TEMP({link: p1, text: p2});
    });
}

const IMGTAG_TO_CONTEXTMENU_TEMP = _.template(
  '<a href="<%- link %>" ' +
  'onclick="require(\'electron\').shell.openExternal(\'<%- link %>\'); return false">' +
  '<img src="<%- link %>" ' +
  'oncontextmenu="var remote = new require(\'electron\').remote; ' +
  'var Menu = remote.Menu;' +
  'var MenuItem = remote.MenuItem;' +
  'var m = new Menu();' +
  'm.append(new MenuItem({label: \'Copy Image Link\',' +
  'click: function() {require(\'electron\').clipboard.writeText(\'<%- link %>\')}}));' +
  'm.popup(remote.getCurrentWindow()); return false;" alt="<%- alt %>" /></a>'
);

function replaceImgtagWithContext(bodyHTML) {
  return bodyHTML.replace(
    /<img.*?src="(https?:\/\/.*?)" (alt="(.*?)"|alt)\/?>/mg,
    (match, p1, p2, p3, offset, string) => {
      return IMGTAG_TO_CONTEXTMENU_TEMP({link: p1, alt: p4 || ''});
    }
  );
}


function render(note, v) {
  var p = replaceAtagToExternal(marked(note.bodyWithDataURL));
  v.$nextTick(() => {
    Array.prototype.forEach.call(
      document.querySelectorAll('.my-el-todo-list'),
      (el) => {
        el.onclick = (event) => {
          var value = event.target.dataset.value;
          var checkBox = value.slice(0, 3);
          var toggled = '';
          if (checkBox == '[ ]') {
            toggled = '[x] ' + value.slice(4);
          } else if (checkBox == '[x]') {
            toggled = '[ ] ' + value.slice(4);
          }
          var body = note.body;
          note.body = body.replace(value + '\n', toggled + '\n');
          event.target.dataset.value = toggled;
        }});
  });
  return p;
}


module.exports = {
  render: render
};
