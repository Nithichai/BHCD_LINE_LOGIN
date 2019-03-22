const express = require('express');
const passport = require('passport');
const LineStrategy = require('passport-line-auth').Strategy;
const jwt = require('jsonwebtoken');
const request = require('request');

const app = express();

passport.use(new LineStrategy({
  channelID: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  callbackURL: 'https://bhcd-line-login.herokuapp.com/login/line/return',
  scope: ['profile', 'openid', 'email'],
  botPrompt: 'normal'
},
function(accessToken, refreshToken, params, profile, cb) {
  const {email} = jwt.decode(params.id_token);
  profile.email = email;
  return cb(null, profile);
}));

// Configure Passport authenticated session persistence.
passport.serializeUser(function(user, cb) {cb(null, user);});
passport.deserializeUser(function(obj, cb) {cb(null, obj);});

// Use application-level middleware for common functionality, including
// parsing, and session handling.
app.use(require('body-parser').urlencoded({extended: true}));
app.use(require('express-session')({secret: 'keyboard dog', resave: true, saveUninitialized: true}));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Define routes.
app.get('/', (req, res) => {
  res.sendStatus(200)
})

app.get('/login/line', passport.authenticate('line'));

app.get('/login/line/return', passport.authenticate('line', {failureRedirect: '/login/line'}), function(req, res) {
  console.log(req.user)
  request({
    method: 'post',
    url: 'http://bhcd-api.herokuapp.com/login/new',
    headers: {
      'Content-Type' : 'application/json'
    },
    json: {
      "data" : {
        "line_id" : req.user.id,
        "bot_id"  : req.user.id,
        "name" : req.user.displayName,
        "email" : req.user.email,
        "pic_url" : req.user.pic_url
      }
    }
  }, (err, response, body) => {
    res.status(response.status)
  })
});

app.get('/logout', function(req, res){
  console.log(req.user)
  request({
    method: "post",
    url: 'https://bhcd-api.herokuapp.com/delete/line-id',
    json: {
      "data" : {
        "line_id" : req.user.id
      }
    }
  }, (err, response, body) => {
    res.status(response.status)
  })
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
})
