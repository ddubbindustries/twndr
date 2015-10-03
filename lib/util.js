var util = {
  commonWords: "rt tonight today new tomorrow make again work thing last "+"love good time next gonna real off never night "+"like know people day think back why name need want life things "+
    "a able about above across after all almost along already also always am an and any anybody anyone anything anyway anyways anywhere apart are aren't around as ask asking at away be because been before behind being below best better between both but by c'mon came can can't cant clearly come comes could couldn't did didn't do does doesn't doing don't done each either else etc even ever every everybody everyone everything everywhere exactly except far few first followed following follows for from get gets getting given gives go goes going gone got gotten had hadn't happens hardly has hasn't have haven't having he he's her here here's hers herself him himself his how however i i'd i'll i'm i've if in instead into is isn't it it'd it'll it's its itself just keep keeps kept let's many may maybe me might more much my neither no not nothing now of oh ok okay old on once one ones only onto or other others our ours ourselves out over own probably quite really right said same saw say saying says see seeing seem seemed seeming seems seen she should shouldn't since so some somebody somehow someone something sometime sometimes somewhere soon still such sure take taken tell than that that's thats the their theirs them themselves then there there's theres these they they'd they'll they're they've this those though through thru to together too took toward towards tried tries truly try trying twice under unfortunately until up us use used uses using usually very vs was wasn't way we we'd we'll we're we've well went were weren't what what's when where where's whether which while who who's whoever whole whom whose will with within without won't would wouldn't yes yet you you'd you'll you're you've your yours yourself yourselves",
  isInString: function(needle, haystack) {
    return (' '+haystack+' ').indexOf(' '+needle+' ') > -1;
  },
  isRelevant: function(input) {
    return !util.isInString(input.toLowerCase(), util.commonWords);
  },
  removeHTML: function(str) { return str.replace(/\<[^\>]*\>/g,''); },
  arrToObj: function(arr, key){
    var obj = {};
    $.each(arr, function(k,v){
      obj[v[key]] = v;
    });
    return obj;
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
      var compressedJSON = util.compressify(obj);
      try {
        localStorage.setItem(key, compressedJSON);
      } catch(e) {
        console.log('this browser\'s localStorage does not have room for ', (compressedJSON.length/1024)+'k', e);
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
  },
  getFileSize: function(obj){
    return (JSON.stringify(obj).length*2/1024).toFixed(1)+'K';
  },
  safeMatch: function(rgx, txt) { 
    var m = txt.match(rgx);
    return m ? m[0] : ''; 
  },
  getHoursAgo: function(timeString){
    return (new Date() - new Date(timeString))/3600000;
  },
  relativeTime: function(post_date, abbr) {
    var abbr = abbr || 1,	
      unit = [
        [1000,	'second',		'sec',	's'],
        [60,	'minute',		'min',	'm'],
        [60,	'hour',			'hr',	'h'],
        [24,	'day',			'day',	'd'],
        [7,		'week',			'wk',	'w'],
        [4.33,	'month',		'mon',	'mo'],
        [12,	'year',			'yr',	'y'],
        [10,	'decade',		'dec',	'X'],
        [10,	'century',		'cen',	'C'],
        [10,	'milleninium',	'mil',	'M']
      ],
      post_date = new Date(post_date),
      today = new Date(),
      diff = today - post_date,
      text = 'some time',
      i = 0;
      
    while (diff >= unit[i][0]) {
      diff = diff / unit[i][0];	
      text = unit[i][abbr];
      if (abbr < 3) text = ' ' + text + (diff.toFixed(0) > 1 ? 's' : '');
      text = diff.toFixed(0) + text;
      i++;
    } 
    return text;
  },
  hyperlinks: function(text) {
    return text
      // http tags
      .replace(/\s(\w+\.[com|org|net|info])/gi, ' http://$1')
      .replace(/(ftp|http|https|file):\/\/[\S]+(\b|$|\.)/gi, '<a href="$&" target="_blank" class="twitter-url">$&</a>')
      //email tags, these are rare
      .replace(/(\w+@{1}[\w\-]+\.[\w\-]+)/gi, '<a href="mailto:$1" target="_blank" class="twitter-url">$1</a>')
      //twitter user
      .replace(/([\.|\,|\:|\Â¡|\Â¿|\>|\{|\(]?)@{1}(\w+)([\.|\,|\:|\!|\?|\>|\}|\)]?\s|\'s|$)/gi, '$1<a href="http://twitter.com/$2" target="_blank" class="twitter-user">@$2</a>$3');
  },
  buildRow: function(obj){
    var out = '';
    $.each(obj, function(k,v){
      out += '<span class="'+k+'">'+v+'</span>';
    });
    return out;
  },
  twitter: {
    parseQuery: function(text) {
      return {
        locale: util.safeMatch(/[a-z\s\.]{2,}\,\s?[a-z]{2,}/i, text),
        distance: util.safeMatch(/[0-9]{1,}(mi|km)/, text),
        time: util.safeMatch(/[0-9]{1,}hr/, text)
      };
    },
    simplifyObj: function(obj) {
      var out = {};
      $.each(obj, function(k,v){
        if (v !== null && k !== 'retweeted_status') out[k] = v;
      });
      out.user = {
        id_str: obj.user.id_str,
        name: obj.user.name,
        screen_name: obj.user.screen_name,
        description: obj.user.description,
        created_at: obj.user.created_at,
        followers_count: obj.user.followers_count,
        statuses_count: obj.user.statuses_count,
        profile_image_url: obj.user.profile_image_url
      };
      return out;
    },
    acceptSource: /Twitter for iPhone|Instagram|TweetCaster for iOS|Tweetbot for Mac|Twitter for Windows Phone|Untappd|iOS|Tweetbot for iΟS|Twitter Web Client|Twitterrific|Foursquare|Twitter for Android Tablets|Twitter for Android|Hootsuite|TweetCaster for Android|Twitter for iPad|Sendible App|Tweetlogix|TweetDeck/,
    formatTweet: function(tweet) {
      var author = tweet.user.screen_name,
        authorLink = 'http://twitter.com/'+author,
        content = '<span class="content"><a href="'+authorLink+'" target="_blank">'+author+'</a>: '+util.hyperlinks(tweet.text)+'</span>',
        timestamp = '<span class="timestamp"><a href="'+authorLink+'/status/'+tweet.id+'" target="_blank" title="'+tweet.created_at+'">'+util.relativeTime(tweet.created_at,3)+'</a></span>',
        loc = '<span class="location">from '+(tweet.location ? tweet.location : 'unknown location')+'</span>';	
        image = '<a href="'+authorLink+'" target="_blank"><img alt="'+author+'" title="'+author+'" src="'+tweet.user.profile_image_url+'"/></a>';
      return image + content + timestamp + loc;
    }
  }
};

if (typeof exports !== 'undefined') exports.util = util;
