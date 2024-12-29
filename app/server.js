let express = require('express');
let path = require('path');
let fs = require('fs');
let os = require('os');
let MongoClient = require('mongodb').MongoClient;
let bodyParser = require('body-parser');
let app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// Serve the index.html
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve profile picture
app.get('/profile-picture', function (req, res) {
  let img = fs.readFileSync(path.join(__dirname, "images/profile-1.jpg"));
  res.writeHead(200, {'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
});

// MongoDB connection URLs
let mongoUrlLocal = "mongodb://admin:password@localhost:27017";
let mongoUrlDocker = "mongodb://admin:password@mongodb";

// MongoDB connection options
let mongoClientOptions = { useNewUrlParser: true, useUnifiedTopology: true };

// Database name
let databaseName = "my-db";

// Endpoint to update profile
app.post('/update-profile', function (req, res) {
  let userObj = req.body;

  MongoClient.connect(mongoUrlLocal, mongoClientOptions, function (err, client) {
    if (err) throw err;

    let db = client.db(databaseName);
    userObj['userid'] = 1;

    let myquery = { userid: 1 };
    let newvalues = { $set: userObj };

    db.collection("users").updateOne(myquery, newvalues, {upsert: true}, function(err, res) {
      if (err) throw err;
      client.close();
    });

  });
  // Send response
  res.send(userObj);
});

// Endpoint to get profile
app.get('/get-profile', function (req, res) {
  let response = {};
  MongoClient.connect(mongoUrlLocal, mongoClientOptions, function (err, client) {
    if (err) throw err;

    let db = client.db(databaseName);

    let myquery = { userid: 1 };

    db.collection("users").findOne(myquery, function (err, result) {
      if (err) throw err;
      response = result;
      client.close();

      // Send response
      res.send(response ? response : {});
    });
  });
});

// Endpoint to get the VM IP
app.get('/get-vm-ip', function (req, res) {
  const interfaces = os.networkInterfaces();
  let internalIp;

  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        internalIp = config.address; // Fetch the VM's internal IP
        break;
      }
    }
    if (internalIp) break;
  }

  res.json({ ip: internalIp });
});

// Start the server
app.listen(3000, function () {
  console.log("app listening on port 3000!");
});
