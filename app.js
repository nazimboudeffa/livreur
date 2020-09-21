const express = require('express');
const mysql = require('mysql');
require('dotenv').config();
const ejs = require('ejs');
const passport = require('passport');
var Strategy = require('passport-local').Strategy;
var db = require('./db');
const CryptoJS = require('crypto-js');
var FacebookStrategy = require('passport-facebook').Strategy;

const app = express();
app.set('view engine', 'ejs');

app.use('/', express.static(__dirname + '/public'));

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

var logged = false;
var con;
//const config = require('./config.json');
const config = {"host" : process.env.host,"user" : process.env.user,"password" : process.env.password,"database" : process.env.database}

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(
  function(email, password, cb) {
    db.users.findByEmail(email, function(err, user) {
      console.log("ok " + email + " " + user.password);
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != CryptoJS.MD5(password)) { return cb(null, false); }
      return cb(null, user);
    });
  }));

passport.use(new FacebookStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: process.env.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    	process.nextTick(function(){

        console.log(profile);

        con = mysql.createConnection({
          host: config.host,
          user: config.user,
          password: config.password,
          database: config.database,
        });

        con.connect();

        con.query("SELECT * FROM livreur_users WHERE id = '" + profile.id + "'", function (err, result, fields) {
          if (err) throw err;
          if (result.length === 0) {

            var sql = "INSERT INTO livreur_facebook (id, token, email, name) VALUES ('"+profile.id+"','"+accessToken+"','test@test.com','"+profile.displayName+"')";

            con.query(sql, function (err, result, fields) {
              if (err) throw err;
              logged = true;
            });
          }
    	});
    })
  }
));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});

app.get('/', function (req, res) {
  res.render('signin' , { logged: logged});
});

app.get('/home', function (req, res) {

  con = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  con.connect();

  con.query("SELECT * FROM cdd_trainings", function (err, results, fields) {
    if (err) throw err;
    if (results.length != 0) {
      res.render('home', { logged: logged, trainings: results });
    } else {
      res.send("There is no training");
    }
  });

});

app.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
  });

app.get('/profile',
  //require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('profile', { logged: logged});
  });

app.get('/signup', function (req, res) {

  res.render('signup', { logged: logged});

})

/*
app.post('/signup', function (req, res) {

  var email = req.body.email;

  // We do an MD5 hash of the password because passwords are stored this way
  var password = CryptoJS.MD5(req.body.password);

  con = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  con.connect();

  con.query("SELECT * FROM livreur_users WHERE email = '" + email + "'", function (err, result, fields) {
    if (err) throw err;
    if (result.length != 0) {

      var sql = "INSERT INTO cdd_users (id, email, password) VALUES ('"+Date.now()+"','"+req.body.email+"','"+CryptoJS.MD5(req.body.password)+"')";

      con.query(sql, function (err, result, fields) {
        if (err) throw err;
        logged = true;
        res.redirect('profile');
      });

    } else {

      var sql = "INSERT INTO livreur_users (id, email, password) VALUES ('1','"+req.body.email+"','"+CryptoJS.MD5(req.body.password)+"')";

      con.query(sql, function (err, result, fields) {
        if (err) throw err;
        logged = true;
        res.redirect('profile');
      });

    }
  });

})
*/

app.post('/signup', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/signup',
  failureFlash: true
}))

app.get('/facebook', passport.authenticate('facebook', {scope: ['email']}));

app.get('/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/profile',
                                      failureRedirect: '/signup' }));

app.get('/signout', function (req, res) {

  con.end();
  logged = false;
  res.render('signup');

})

app.get('/signin', function (req, res) {

  res.render('signin', { logged: logged});

})

app.post('/signin', function (req, res) {

  var email = req.body.email;

  // We do an MD5 hash of the password because passwords are stored this way
  var password = CryptoJS.MD5(req.body.password);

  con = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  con.connect();

  con.query("SELECT * FROM livreur_users WHERE email = '" + email + "'", function (err, result, fields) {
    if (err) throw err;
    if (result.length != 0) {
      if (result[0].password == password) {
        logged = true;
        if (result[0].id == '1') {
          //res.redirect('admin');
          res.redirect('profile');
        } else {
          res.redirect('profile');
        }
      } else {
        res.send("Wrong Password");
      }
    } else {
      res.send("User Not Found");
    }
  });

})


app.get('/profile', function (req, res) {

  res.render('profile');

})

var port = process.env.PORT || 3000;

app.listen(port, function () {

  console.log('App listening on port 3000!')

})
