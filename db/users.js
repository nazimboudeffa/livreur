const mysql = require('mysql');
const config = {"host" : process.env.host,"user" : process.env.user,"password" : process.env.password,"database" : process.env.database}

var con;
var records;

con = mysql.createConnection({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database
});

con.query("SELECT * FROM livreur_users", function (err, result, fields) {
  records = result;
});

exports.findById = function(id, cb) {
  process.nextTick(function() {
    console.log(records);
    var idx = id - 1;
    if (records[idx]) {
      cb(null, records[idx]);
    } else {
      cb(new Error('User ' + id + ' does not exist'));
    }
  });
}

exports.findByUsername = function(username, cb) {
  process.nextTick(function() {
    for (var i = 0, len = records.length; i < len; i++) {
      var record = records[i];
      if (record.username === username) {
        return cb(null, record);
      }
    }
    return cb(null, null);
  });
}
