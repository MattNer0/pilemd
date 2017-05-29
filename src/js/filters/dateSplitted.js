const moment = require('moment');

const arr = require('../utils/arr');

const TODAY_TEXT = 'Today';
const YESTERDAY_TEXT = 'Yesterday';
const WEEK_AGO_TEXT = 'A Week Ago';


module.exports = function(Vue, options) {
  Vue.filter('dateSeparated', function(notes, property) {
    if (notes.length == 0) {
      return notes;
      /*return [
        {dateStr: "No notes, let's write",
         notes: []}
      ]*/
    }
    //var now = moment();
    var sorted = arr.sortBy(notes.slice(), property);
    return sorted;
    /*function getDateDiff(to, from) {
      var t = moment([to.year(), to.month(), to.date()]);
      var f = moment([from.year(), from.month(), from.date()]);
      return t.diff(f, 'days');
    }
    function getDateStr(d) {
      var diff = getDateDiff(now, d);
      if (diff == 0) {
        return TODAY_TEXT
      } else if (diff == 1) {
        return YESTERDAY_TEXT
      } else if (diff == 7) {
        return WEEK_AGO_TEXT + ' (' + d.format('MMM DD') + ')'
      } else {
        return d.format('ddd, MMM DD')
      }
    }
    var ret = [];
    var lastDate = null;
    sorted.forEach((note) => {
      if (!lastDate) {
        lastDate = {dateStr: getDateStr(note[property]),
                    date: note[property],
                    notes: [note]};
      } else if (getDateDiff(lastDate.date, note[property]) > 0) {
        ret.push(lastDate);
        lastDate = {dateStr: getDateStr(note[property]),
                    date: note[property],
                    notes: [note]};
      } else {
        lastDate.notes.push(note)
      }
    });
    ret.push(lastDate);
    return ret;*/
  });
};
