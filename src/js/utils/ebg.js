function ebg(str) {
  var ret_str = '';
  var code_A = 'A'.charCodeAt(0);
  var code_a = 'a'.charCodeAt(0);
  var code_N = 'N'.charCodeAt(0);
  var code_n = 'n'.charCodeAt(0);
  var code_Z = 'Z'.charCodeAt(0);
  var code_z = 'z'.charCodeAt(0);

  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if ((code_A <= code && code < code_N) || (code_a <= code && code < code_n)) {
      code = code + 13;
    } else if ((code_N <= code && code <= code_Z) || (code_n <= code && code <= code_z)) {
      code = code - 13;
    }
    ret_str += String.fromCharCode(code);
  }
  return ret_str;
}

module.exports = ebg;
