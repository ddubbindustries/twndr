cfg = require('./cfg.js').cfg;
util = require('../lib/util.js').util;
go = require('./controllr.js').go;
tweetr = require('./tweetr');
emailr = require('./emailr');

cfg.maxTries = 2000;
cfg.maxTime = 10000;
cfg.maxChunks = 2000;
cfg.streamInterval = 60*15;
cfg.postTweet = false;
cfg.stats = false;

var hooks = {
  init: function(){
    console.log('server init', cfg);
  },
  process: function(chunks){},
  refresh: function(lex){ 
    console.log({refresh: new Date().toISOString(), chunkCount: lex.meta.chunkCount, tallyCount: lex.meta.tallyCount});
    console.log('chunks:', go.meta);
    console.log('top:', lex.meta.topArr.join(', '));
    var twipObj = lex.output.line(cfg);
    console.log('twip:', twipObj.text, twipObj.stats);
  },
  finalize: function(lex){
    var tweet = lex.output.format(cfg);
		console.log('ready to tweet:', tweet);
    if (cfg.postTweet) tweetr.post(tweet);
    
    var altCfg = cfg;
        altCfg.sets = 5;
        altCfg.stats = true;
    
    emailr.send({
      from: 'Twndr <bot@twndr.com>',
      to: 'dtw@vt.edu',
      subject: tweet,
      text: JSON.stringify({
          cfg: cfg,
          alt: lex.output.format(altCfg),
          topArr: lex.meta.topArr
        }, null, '\t') +
        "\n\n@twndr via Mailgun"
    });
    util.local.store(new Date().toISOString().replace(/[^0-9]/g,'') + '_chunks', lex.chunks);
    util.local.store('chunks','');
    go.init(hooks);
  }
};

go.init(hooks);

