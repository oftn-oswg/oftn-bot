var HTTPS = require("https");

var youtube = module.exports = function(query, callback) {
  var self = this;

  var request = HTTPS.get({
    'host': 'www.googleapis.com',
    'path': "/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&key=<pasteSomeGoogleAPIKeyHere>&id=" + query,
    'Referer': 'http://www.v8bot.com',
    'User-Agent': 'NodeJS HTTP client',
    'Accept': '*/*'
  })

  request.addListener('response', function(response) {
    response.setEncoding('utf8');
    var body = "";
    response.addListener('data', function(chunk) { body += chunk; });
    response.addListener('end', function() {
      var videoData = JSON.parse(body);
      var video = videoData.items && videoData.items.length && videoData.items[0] || null
      if (video) {
        callback.call(self, {
          title: video.snippet.title,
          user: video.snippet.channelTitle,
          duration: video.contentDetails.duration,
          views: video.statistics.viewCount,
          likes: video.statistics.likeCount,
          dislikes: video.statistics.dislikeCount,
        });
      } else {
        callback.call(self, null);
      }
    });
  });
};
