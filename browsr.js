var printWords = function(arr, template, charLength) {
  var $printOut = $('<div/>'),
      total = '';

  $.each(arr, function(i,v){
    var idselectors = '#'+v.ids.join(', #');

    total += v.word + ' ';
    if (total.length - 1 > charLength) return false;

    $(template(v)).addClass('filterWord').click(function(){
      $('.text .hilight').contents().unwrap();
      if ($(this).is('.hilight')) {
        $('.tweet').show();
        $('.hilight').removeClass('hilight');

        $.each(markers, function(id,marker){
          marker.setVisible(true);
        });
      } else {
        $('.hilight').removeClass('hilight');
        $(this).addClass('hilight');
        $('.tweet').hide()
          .filter(idselectors).show()
          .find('.text').html(function(i,html){
            return html.replace(
              new RegExp('\\b'+v.word+'\\b', 'ig'),
              '<span class="hilight">$&</span>'
            );
          });

        $.each(markers, function(id,marker){
          marker.setVisible(v.ids.indexOf(id) > -1);
        });
      }
    }).appendTo($printOut);
  });

  return $printOut.contents();
};

var initBrowser = function(){
  var cfg = util.local.get('cfg') || {},
      $out = $('#out'),
      $stats = $('#stats'),
      $search = $('#search').val(cfg.search);

  $('#input').submit(function(e){
    e.preventDefault();
    $out.empty();

    var Twndr = new Go({
      maxRetweet: 25,
      maxPerUser: 10,
      twendLength: 140,
      search: $('#search').val(),
      afterGeo: initMap,
      processTweet: function(tweet) {

        if (tweet.geo) setTimeout(addMarker, tweet._delay || 0, tweet);

        var hoursRelative = util.getHoursAgo(tweet.created_at),
            userlink = 'http://twitter.com/'+tweet.user.screen_name,
            permalink = userlink+'/status/'+tweet.id_str,
            media = tweet.entities.media;
            media = media ? '<img class="media" src="'+media[0].media_url+'">' : '',
            columns = {
              time:   hoursRelative.toFixed(1)+'h', //util.relativeTime(tweet.created_at, 3),
              tpd:    (tweet.user.statuses_count / util.getHoursAgo(tweet.user.created_at) * 24).toFixed(1),
              flw:    tweet.user.followers_count,
              fav:    tweet.favorite_count,
              RT:     tweet.retweet_count,
              src:    util.getFaviconFromAnchor(tweet.source),
              user:   '<a target="_blank" href="'+userlink+'" title="'+tweet.user.screen_name+': '+
                        tweet.user.description+'"><img src="'+tweet.user.profile_image_url+'"></a>',
              text:   twemoji.parse(util.hyperlinks(tweet.text)) // + media,
            };

        if (!$('#tweetHead').text()) {
          var header = {};
          $.each(columns, function(k,v){ header[k] = k; });
          $('#tweetHead').html(util.buildRow(header));
        } else {
          $out.append('<div id="'+tweet.id_str+'" class="tweet row">'+util.buildRow(columns)+'</div>');
        }
      },
      afterBatch: function(go){
        $stats.html((go.percentDone*100).toFixed()+'% of history ');
        $.each(go.tweetStore, function(k,v){ $stats.append(k+': '+Object.keys(v).length+' '); });

        $('#twend').html(printWords(go.topArr, function(v){
          return '<span title="'+v.count+'">'+twemoji.parse(v.word)+'</span>';
        }, go.cfg.twendLength));

        $('#words').html(printWords(go.topArr, function(v){
          return '<li>'+twemoji.parse(v.word)+' '+v.count+'</li>';
        }));

        var userTop = util.sortArr(util.objToArr(go.freq.user, 'word'), 'count');
        $('#users').html(printWords(userTop, function(v){
          return '<li>'+twemoji.parse(v.word)+' '+v.count+'</li>';
        }));
      },
      afterAll: function(go) {
        util.local.store('cfg', go.cfg);

        //equalize table header
        var widths = [];
        $('.tweet:eq(0) span').each(function(k,v){ widths.push($(v).width()); });
        $.each(widths, function(k,v){ $('#tweetHead span').eq(k).width(v) });

        $('.tweet').click(function(){
          var thisId = $(this).attr('id'),
              tweet = go.tweetStore.ok[thisId];
          console.log('this tweet', tweet);
        }).mouseenter(function(){
          markers[$(this).attr('id')].setAnimation(google.maps.Animation.BOUNCE);
        }).mouseout(function(){
          markers[$(this).attr('id')].setAnimation(null);
        });
        console.log('all done! tweetStore:', go.twend, go.tweetStore);
      }
    });
  }).submit();

  $('#cache').click(function(){
    localStorage.clear();
    $('#input').submit();
  });
};

$(document).ready(initBrowser);
