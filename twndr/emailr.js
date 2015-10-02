exports.send = function(msg) {

  var https = require('https'),
      query = require('querystring');

  var msg = msg || {
    from: 'Twndr <bot@twndr.com>',
    to: 'dave.williams@rackspace.com',
    subject: 'privit mir',
    text: 'in the beginning'
  };

  var post_data = query.stringify(msg),
    opt = {
    host: 'api.mailgun.net',
    path: '/v2/ddubb.mailgun.org/messages',
    method: 'POST',
    auth: 'api:key-7omq42bk-kon-lk0whnquh0rit19eyp4',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length
    }
  },
  req = https.request(opt, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(chunk){
      console.log('mailgun response:',chunk);
    });
  }).on('error', function(e) {
    console.log('req error:',e);
  });

  req.end(post_data);
};
