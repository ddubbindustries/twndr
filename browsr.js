var print = {
  facets: function(arr, itemTemplate) {
    var $printOut = $('<div/>');

    $.each(arr, function(i,v){
      var idselectors = '#'+v.ids.join(', #');

      $(itemTemplate(v)).addClass('facet').click(function(){
        console.log('facet', v);
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
              var rgx = /^\W/.test(v.word) ? v.word : '\\b'+v.word+'\\b';
              return html.replace(new RegExp(rgx, 'ig'), '<span class="hilight">$&</span>');
            });

          $.each(markers, function(id,marker){
            marker.setVisible(v.ids.indexOf(id) > -1);
          });
        }
      }).appendTo($printOut);
    });

    return $printOut.contents();
  },
  facetColumn: function(name, content) {
    return $('<div id="'+name+'" class="col"/>').append(
      $('<div class="note"/>').html(name),
      $('<ol class="freq scroll"/>').html(content)
    );
  },
  fixHeader: function(){
    var widths = [];
    $('.tweet:eq(0) span').each(function(k,v){ widths.push($(v).width()); });
    $.each(widths, function(k,v){ $('#tweetHead span').eq(k).width(v) });
  }
};

var initCfg = {
  search: 'Blacksburg, VA 5mi 48hr',
  twendLength: 140
};

var initBrowser = function(){
  var cfg = util.local.get('cfg') || initCfg,
      $out = $('#out'),
      $stats = $('#stats'),
      $search = $('#search').val(cfg.search);

  $('#input').submit(function(e){
    e.preventDefault();
    $out.empty();
    ga('send', 'event', 'user', 'submit', 'search', $search.val());

    var Twndr = new Go({
      search: $search.val(),
      maxPerUser: 10,
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
        console.time('print');

        $stats.html((go.percentDone*100).toFixed()+'% of history ');
        $.each(go.tweetsProc, function(k,v){ $stats.append(k+': '+Object.keys(v).length+' '); });

        var total = '';
        $('#twend').html(print.facets(go.twendArr, function(v){
          total += v.word + ' ';
          return total.length <= go.cfg.twendLength ? '<span>'+twemoji.parse(v.word)+'</span>' : false;
        }));

        $('#facets').empty().append(
          print.facetColumn('words', print.facets(go.freq.words.topArr, function(v){
            return '<li>'+twemoji.parse(v.word)+' '+v.count+'</li>';
          })),

          print.facetColumn('hashtags', print.facets(go.freq.hashes.topArr, function(v){
            return '<li>'+v.word+' '+v.count+'</li>';
          })),

          print.facetColumn('fuzzy match', print.facets(go.freq.combos.topArr, function(v){
            return '<li>'+twemoji.parse(v.word)+' '+v.count+'</li>';
          })),

          print.facetColumn('users', print.facets(go.freq.users.topArr, function(v){
            return '<li><img title="'+v.word+'" src="'+
              go.freq.users.list[v.word].meta.profile_image_url+'"> '+v.count+'</li>';
          })),

          print.facetColumn('src', print.facets(go.freq.sources.topArr, function(v){
            return '<li>'+util.getFaviconFromAnchor(v.word)+' '+v.count+'</li>';
          }))
        );
        console.timeEnd('print');
      },
      afterAll: function(go) {
        util.local.store('cfg', go.cfg);

        print.fixHeader();

        $('.tweet').click(function(){
          var thisId = $(this).attr('id'),
              tweet = go.tweetsProc.ok[thisId];
          console.log('this tweet', tweet);
        }).mouseenter(function(){
          markers[$(this).attr('id')].setAnimation(google.maps.Animation.BOUNCE);
        }).mouseout(function(){
          markers[$(this).attr('id')].setAnimation(null);
        });
        console.log('all done! tweetsProc:', go.twend, go.tweetsProc);
        freq = go.freq;
      }
    });
  }).submit();

  $('#cache').click(function(){
    localStorage.clear();
  });
};

$(document).ready(initBrowser);
