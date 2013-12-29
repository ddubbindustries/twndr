Array.prototype.deepIndexOf = function(val){
  var index = -1, jsonVal = JSON.stringify(val);
  $.each(this, function(k,v){
    if (JSON.stringify(v) == jsonVal) {
      index = k;
      return false;
    }
  });
  return index;
};
/*Array.prototype.xdeepIndexOf = function(val){
  var index =-1, jsonVal = JSON.stringify(val);
  for(var i = 0, ii = this.length; i < ii; i++){
    if (JSON.stringify(this[i]) == jsonVal) {
      index = i;
      break;
    }
  }
  return index;
};*/

var encode = function(obj){
  var keys = [], offset = 150;
  keys.append = function(v){
    var index = this.deepIndexOf(v);
    if (index == -1) {
      this.push(v);
      index = this.length-1;
    }
    return String.fromCharCode(index+offset);
  };
  var recurse = function(obj) {
    if (typeof(obj) !== 'object' || obj === null) return obj;          
    var isArray = $.isArray(obj), out = isArray ? [] : {}, newKey, newVal;
    $.each(obj, function(k,v){
      newVal = keys.append(recurse(v));
      if (isArray) {
        out.push(newVal);
      } else {
        newKey = keys.append(k);
        out[newKey] = newVal;
      }
    });
    return out;
  };
  return JSON.stringify({k: keys, o: recurse(obj)});
};

var decode = function(json){
  var obj = JSON.parse(json),
      offset = 150,
      keys = obj.k,
      recurse = function(obj){
        if (typeof(obj) !== 'object' || obj === null) return obj;
        var isArray = $.isArray(obj), out = isArray ? [] : {}, newKey, newVal;
        
        $.each(obj, function(k,v){
          newVal = recurse(keys[v.charCodeAt(0)-offset]);
          if (isArray) {
            out.push(newVal);
          } else {
            out[keys[k.charCodeAt(0)-offset]] = newVal;
          }
        });
        return out;
      };
  return recurse(obj.o);
};
