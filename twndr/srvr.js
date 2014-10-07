cfg = require('./cfg.js').cfg;
util = require('../lib/util.js').util;
go = require('./controllr.js').go;
tweetr = require('./tweetr');
emailr = require('./emailr');

if (cfg.filterWords.length) {
  util.commonWords = cfg.filterWords.join(' ') + ' ' + util.commonWords;
}

go.init({
  init: function(){
    console.log('controller init', cfg);
  },
  process: function(chunk){
    process.stdout.write('.');
  },
  refresh: function(lex){ 
    console.log({
      refreshed_at: new Date().toISOString(),
      latest_batch: go.meta,
      total_chunks: lex.meta.chunkCount,
      total_words:  lex.meta.tallyCount,
      top_words:    lex.meta.topArr.slice(0,20).join(', '),
      twip:         lex.output.popular(cfg),
      sentence:     lex.output.format(cfg)
    });
  },
  finalize: function(lex){
    var tweet = lex.output.popular(cfg);
    if (cfg.postTweet) {
      tweetr.post(tweet, 'prod');
    } else {
		  console.log('ready to tweet:', tweet);
    }
    
    emailr.send({
      from: 'Twndr <bot@twndr.com>',
      to: 'dtw@vt.edu',
      subject: tweet,
      text: JSON.stringify({
          cfg: cfg,
          topArr: lex.meta.topArr
        }, null, '\t') +
        "\n\n@twndr via Mailgun"
    });
  }
});
