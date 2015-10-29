//
// A Naïve Bayes Classifier
// https://web.stanford.edu/class/cs124/lec/naivebayes.pdf
//

var api = 'http://localhost:8089';
var tags = ['kudos','bug','support','security','setup'];
var presets = {
  'kudos': [
    '<201509141453.t8EEr6ur042378@rly31g.srv.mailcontrol.com>',
    '<201507120827.t6C8R0VC004990@rly38g.srv.mailcontrol.com>',
    '<201506302333.t5UNX2Ct002974@rly16g.srv.mailcontrol.com>',
    '<201509011642.t81Gg6xp023592@rly35g.srv.mailcontrol.com>',
    '<201507010758.t617wbnH016505@rly04g.srv.mailcontrol.com>',
    '<201508201459.t7KEx4VQ041869@rly06g.srv.mailcontrol.com>',
    '<1440121689780.94938@rackspace.com>',
    '<201506181118.t5IBIHnZ004771@rly03g.srv.mailcontrol.com>',
    '<201510040342.t943gJiW011589@rly07g.srv.mailcontrol.com>',
    '<201508251443.t7PEhPlH035827@rly04g.srv.mailcontrol.com>',
    '<201506300436.t5U4aYrV017011@rly16g.srv.mailcontrol.com>',
    '<201509251539.t8PFdiEO034035@rly07g.srv.mailcontrol.com>'
  ],
  'bug': [
    '<201506031730.t53HUiK6027852@rly02g.srv.mailcontrol.com>',
    '<201507171434.t6HEYvCo041870@rly04g.srv.mailcontrol.com>',
    '<201507080355.t683tPKc023130@rly16g.srv.mailcontrol.com>',
    '<201509302159.t8ULxVqK039877@rly11g.srv.mailcontrol.com>',
    '<201509302216.t8UMG4Ge030021@rly35g.srv.mailcontrol.com>'
  ],
  'support': [
    '<201506221533.t5MFXAiI015742@rly08g.srv.mailcontrol.com>',
    '<201507212249.t6LMnib1045133@rly11g.srv.mailcontrol.com>',
    '<201509120743.t8C7hwgs032090@rly10g.srv.mailcontrol.com>',
    '<1440121689780.94938@rackspace.com>',
    '<201510040342.t943gJiW011589@rly07g.srv.mailcontrol.com>',
    '<201509251539.t8PFdiEO034035@rly07g.srv.mailcontrol.com>'
  ],
  'security': [
    '<201508241604.t7OG4P5M039097@rly01g.srv.mailcontrol.com>',
    '<201507111650.t6BGo9Qw042399@rly02g.srv.mailcontrol.com>',
    '<201509140712.t8E7C1V6025834@rly09g.srv.mailcontrol.com>',
    '<201508040841.t748fNmu030081@rly16g.srv.mailcontrol.com>'
  ],
  'setup': [
    '<201509011642.t81Gg6xp023592@rly35g.srv.mailcontrol.com>',
    '<201507010758.t617wbnH016505@rly04g.srv.mailcontrol.com>',
    '<201506181118.t5IBIHnZ004771@rly03g.srv.mailcontrol.com>'
  ]
};
var totalTags = 0;
var all = new Lex();
var setMap = function(tags){
  var map = {};
  $.each(tags, function(k,v){
    map[v] = {
      ids: [],
      tokens: new Lex(),
      getFrequency: function(){
        return this.ids.length / totalTags;
      }
    };
  });
  return map;
};

function view($scope, $http){

  $scope.tags = tags;
  $scope.map = setMap(tags);

  $scope.greaterThan = function(prop, val){
      return function(item){
        return item[prop] > val;
      }
  };

  $scope.preset = function(email){
    $.each(presets, function(tagName, ids){
      if (ids.indexOf(email.header.messageId) > -1) $scope.toggleTag(tagName, email);
    });
  };

  $scope.getTextProb = function(tagName, text){
    var tag = $scope.map[tagName],
        lex = tag.tokens,
        tokens = lex.tokenize(text),
        total = Math.log10(tag.getFrequency());

    $.each(tokens, function(k,v){
      if (lex.list[v]) total += lex.list[v].prob;
    });
    return total;
  };

  $scope.getTagProbs = function(text){
    var out = {}, final = {};
    $.each(tags, function(k,v){
      out[v] = {prob: $scope.getTextProb(v, text)};
    });
    return all.addRank(out, 'prob');
  };

  $scope.toggleTag = function(tagName, email){
    var text = email.body,
        chunkId = email.header.messageId,
        tag = $scope.map[tagName],
        index = tag.ids.indexOf(chunkId);

    if (index == -1) {
      totalTags++;
      tag.ids.push(chunkId);
      tag.tokens.addChunk(text, chunkId);
      all.addChunk(text, chunkId);
    } else {
      totalTags--;
      tag.ids.splice(index, 1);
      tag.tokens.unChunk(text, chunkId);
      all.unChunk(text, chunkId);
    }

    // set probs
    $scope.map[tagName].tokens.setProbs(all.unique).setTop();
    console.log('toggling', tagName, chunkId, $scope.map);
  };

  $scope.showData = function(obj){
    console.log('data', this, obj);
  };

  $scope.getjson = function(){
    $http
      .jsonp(api, {params: {
        file: 'output.json',
        callback: 'JSON_CALLBACK'
      }})
      .then(function(res){
        console.log('response', res);
        $scope.data = res.data.filter(function(v){
          return typeof(v['0']) == 'string';
        }).map(function(v){
          return {
            body: v['0'].replace(/Email\:[^]+/g,''),
            header: v.header
          };
        });
      }, function(err) {
        console.log('err', err);
      });
  };
}
