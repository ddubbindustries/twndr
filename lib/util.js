var util = {
  commonWords: "br rt "+"tonight today new tomorrow make again work thing last "+"love good time next gonna real off never night "+"like know people day think back why name need want life things "+"a able about above across after all almost along already also always am an and any anybody anyone anything anyway anyways anywhere apart are aren't around as ask asking at away be because been before behind being below best better between both but by c'mon came can can't cant clearly come comes could couldn't did didn't do does doesn't doing don't done each either else etc even ever every everybody everyone everything everywhere exactly except far few first followed following follows for from get gets getting given gives go goes going gone got gotten had hadn't happens hardly has hasn't have haven't having he he's her here here's hers herself him himself his how however i i'd i'll i'm i've if in instead into is isn't it it'd it'll it's its itself just keep keeps kept let's many may maybe me might more much my neither no not nothing now of oh ok okay old on once one ones only onto or other others our ours ourselves out over own probably quite really right said same saw say saying says see seeing seem seemed seeming seems seen she should shouldn't since so some somebody somehow someone something sometime sometimes somewhere soon still such sure take taken tell than that that's thats the their theirs them themselves then there there's theres these they they'd they'll they're they've this those though through thru to together too took toward towards tried tries truly try trying twice under unfortunately until up us use used uses using usually very vs was wasn't way we we'd we'll we're we've well went were weren't what what's when where where's whether which while who who's whoever whole whom whose will with within without won't would wouldn't yes yet you you'd you'll you're you've your yours yourself yourselves",
  isInString: function(needle, haystack) {
    return (' '+haystack+' ').indexOf(' '+needle+' ') > -1;
  },
  isRelevant: function(input) {
    return !util.isInString(input.toLowerCase(), util.commonWords);
  },
  twitterScrape: function(str) {
    return str
      .match(/\n\S[^\n]*/g)
      .filter(function(v){return !(/^\nExpand|^\nFollowed/g).test(v);})
      .join();
  },
  simplifyTweetObj: function(obj) {
    var out = {};
    $.each(obj, function(k,v){
      if (v !== null && k !== 'retweeted_status') out[k] = v;
    });
    out.user = {
      id_str: obj.user.id_str,
      screen_name: obj.user.screen_name,
      followers_count: obj.user.followers_count,
      statuses_count: obj.user.statuses_count
    };
    return out;
  },
  capitalize: function(string) {
    return string[0] ? (string[0].toUpperCase() + string.slice(1)) : string;
  },
  buildConfigs: function(obj, onChange, $elem) {
    var $elem = $elem || $('#configs');
    $elem.empty();
    $.each(obj, function(k,v){
      var id = k + '_input',
          $input = (typeof(v) == 'boolean') ?
            $('<input type="checkbox"/>').attr({checked: v}) :
            $('<input type="text"/>').val(v).width(v.length*8);
      $elem
        .append('<label for="'+id+'">'+k+'</label>')
        .append(
          $input
            .attr({name: k, id: id})
            .keyup(function(){$(this).blur().focus();})
            .change(onChange)
        );
    });
  },
  getConfigs: function($elem) {
    var $elem = $elem || $('#configs'),
        obj = {};
    $elem.find('input').each(function(){
      var $t = $(this);
      obj[$t.prop('name')] = $t.is(':checkbox') ? $t.prop('checked') : $t.val();
    });
    return Object.keys(obj).length ? obj : false;
  },
  local: {
    store: function(key, obj) {
      try {
        localStorage.setItem(key, util.compressify(obj));
      } catch(e) {
        console.log('to much data for this browser to store locally', e);
      }
    },
    get: function(key) {
      var data = typeof(localStorage) !== 'undefined' ? localStorage.getItem(key) : false;
      return data ? util.decompressify(data) : false;
    }
  },
  deepIndexOf: function(arr, val) { 
    var index = -1, jsonVal = JSON.stringify(val);
    $.each(arr, function(k,v){
      if (JSON.stringify(v) == jsonVal) {
        index = k;
        return false;
      }
    });
    return index;
    /*
    var index =-1, jsonVal = JSON.stringify(val);
    for(var i = 0, ii = arr.length; i < ii; i++){
      if (JSON.stringify(arr[i]) == jsonVal) {
        index = i;
        break;
      }
    }
    return index;
    */
  },
  compressify: function(obj){
    // compress to about 65% of JSON.stringify
    var keys = [],
        offset = 150;
    keys.append = function(v){
      //for better comparison when using values in with keys
      //var index = util.deepIndexOf(this, v);
      var index = this.indexOf(v);
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
        //store keys and values in keys, better compression but too slow
        //newVal = keys.append(recurse(v));
        newVal = recurse(v);
        if (isArray) {
          out.push(newVal);
        } else {
          newKey = keys.append(k);
          out[newKey] = newVal;
        }
      });
      return out;
    };
    return JSON.stringify({c: offset, k: keys, o: recurse(obj)});
  },
  decompressify: function(json){
    var obj = JSON.parse(json),
        offset = obj.c,
        keys = obj.k,
        recurse = function(obj){
          if (typeof(obj) !== 'object' || obj === null) return obj;
          var isArray = $.isArray(obj), out = isArray ? [] : {}, newKey, newVal;
          $.each(obj, function(k,v){
            //values in with keys, better compression but too slow
            //newVal = recurse(keys[v.charCodeAt(0)-offset]);
            newVal = recurse(v);
            if (isArray) {
              out.push(newVal);
            } else {
              out[keys[k.charCodeAt(0)-offset]] = newVal;
            }
          });
          return out;
        };
    return recurse(obj.o);
  }
},
dump = function(obj){
  if ($('#dump').length == 0) $('<div id="dump"/>').appendTo('body');
  $('#dump').prepend(JSON.stringify(obj,null,'\t'));
};

if (typeof exports !== 'undefined') exports.util = util;
