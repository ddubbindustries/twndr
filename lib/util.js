var util = {
  commonWords: "br "+"love good time next gonna real off never night "+"like know people day think back why name need want life things "+"a able about above across after all almost along already also always am an and any anybody anyone anything anyway anyways anywhere apart are aren't around as ask asking at away be because been before behind being below best better between both but by c'mon came can can't cant clearly come comes could couldn't did didn't do does doesn't doing don't done each either else etc even ever every everybody everyone everything everywhere exactly except far few first followed following follows for from get gets getting given gives go goes going gone got gotten had hadn't happens hardly has hasn't have haven't having he he's her here here's hers herself him himself his how however i i'd i'll i'm i've if in instead into is isn't it it'd it'll it's its itself just keep keeps kept let's many may maybe me might more much my neither no not nothing now of oh ok okay old on once one ones only onto or other others our ours ourselves out over own probably quite really right said same saw say saying says see seeing seem seemed seeming seems seen she should shouldn't since so some somebody somehow someone something sometime sometimes somewhere soon still such sure take taken tell than that that's thats the their theirs them themselves then there there's theres these they they'd they'll they're they've this those though through thru to together too took toward towards tried tries truly try trying twice under unfortunately until up us use used uses using usually very vs was wasn't way we we'd we'll we're we've well went were weren't what what's when where where's whether which while who who's whoever whole whom whose will with within without won't would wouldn't yes yet you you'd you'll you're you've your yours yourself yourselves",
  isInString: function(needle, haystack) {
    return (' '+haystack+' ').indexOf(' '+needle+' ') > -1;
  },
  isRelevant: function(input) {
    return !util.isInString(input.toLowerCase(), util.commonWords);
  },
  twitterScrape: function(str){
    return str
      .match(/\n\S[^\n]*/g)
      .filter(function(v){return !(/^\nExpand|^\nFollowed/g).test(v);})
      .join();
  },
  capitalize: function(string){
    return string[0] ? (string[0].toUpperCase() + string.slice(1)) : string;
  },
  buildConfigs: function(obj, onChange, $elem){
    var $elem = $elem || $('#configs');
    $.each(obj, function(k,v){
      var id = k + '_input',
          $input = (typeof(v) == 'boolean') ?
            $('<input type="checkbox"/>').attr({checked: v}) :
            $('<input type="text"/>').val(v);
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
    return obj;
  }
},
dump = function(obj){
  if ($('#dump').length == 0) $('<div id="dump"/>').appendTo('body');
  $('#dump').append(JSON.stringify(obj,null,'\t'));
};
