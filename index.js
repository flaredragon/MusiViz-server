const express = require('express'),
      SpotifyWebApi = require('spotify-web-api-node'),
      fs = require('fs'),
      request = require('request'),
      cors = require('cors'),
      querystring = require('querystring'),
      cookieParser = require('cookie-parser'),
      client_id = require('./secrets').client_id,
      client_secret = require('./secrets').client_secret,
      app = express();

app.use(cors())
   .use(cookieParser());

var stateKey = 'spotify_auth_state';


var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  var scope = 'user-read-private user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: 'https://stark-dawn-75160.herokuapp.com/callback',
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('http://musiviz.surge.sh/stats?' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        grant_type: 'authorization_code',
	redirect_uri: 'https://stark-dawn-75160.herokuapp.com/callback'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    console.log(authOptions);
    request.post(authOptions, function(error, response, body) {
	console.log(error,body);
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('http://musiviz.surge.sh/stats?' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('http://musiviz.surge.sh/stats?' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});






app.listen( process.env.PORT||4000, () => {
  console.log('Listening');
});


