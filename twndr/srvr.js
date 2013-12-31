var cfg = require('./cfg.js').cfg,
    go = require('./controllr.js').go,
    tweetr = require('./tweetr'),
    emailr = require('./emailr');

cfg.maxTries = 1000;
cfg.maxTime = 3000;
cfg.streamInterval = 60*10;

go.init({
  init: function(){
    console.log('server init', cfg);
  },
  process: function(chunks){},
  refresh: function(){ 
    console.log({refresh: new Date().toISOString(), chunkCount: lex.meta.chunkCount, tallyCount: lex.meta.tallyCount});
    console.log('chunks:', go.meta);
    console.log('top:', lex.meta.topArr.slice(0, cfg.topCount).join(', '));
    console.log('twip:', lex.output.format(cfg));
  },
  finalize: function(){
    var tweet = lex.output.format(cfg);
		console.log('ready to tweet:', tweet);
    tweetr.postTweet(tweet);
    emailr.send({
      from: 'Twndr <bot@twndr.com>',
      to: 'dtw@vt.edu',
      subject: tweet,
      text: JSON.stringify(lex.meta.topArr,null,'\t') +
        "\n\n@twndr via Mailgun"
    });
    go.init();
  }
});

