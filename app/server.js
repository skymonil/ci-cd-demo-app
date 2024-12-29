let express = require('express');
let path = require('path');
let fs = require('fs');
let MongoClient = require('mongodb').MongoClient;
let bodyParser = require('body-parser');
let app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    const vmIpAddress = process.env.VM_IP_ADDRESS || '192.168.179.134';
    res.send(`
        <html lang="en">
        <head>
            <style>
                .container { margin: 40px auto; width: 80%; }
                .button { width: 160px; height: 45px; border-radius: 6px; font-size: 15px; margin-top: 20px; }
                img { width: 328px; height: 287px; display: block; margin-bottom: 20px; }
                hr { width: 400px; margin-left: 0; }
                h3 { display: inline-block; }
                #container, #container-edit { display: none; }
                #container-edit input { height: 32px; width: 195px; font-size: 15px; }
                #container-edit hr { margin: 25px 0; }
            </style>
        </head>
        <body>
            <div class="container" id="container">
                <h1>User profiles</h1>
                <img src="profile-picture" alt="user-profile">
                <span>Name: </span><h3 id="name">Anna Smith</h3>
                <hr>
                <span>Email: </span><h3 id="email">anna.smith@example.com</h3>
                <hr>
                <span>Interests: </span><h3 id="interests">coding</h3>
                <hr>
                <button class="button" onclick="updateProfile()">Edit Profile</button>
            </div>
            <div class="container" id="container-edit">
                <h1>User profile</h1>
                <img src="profile-picture" alt="user-profile">
                <span>Name: </span><label for="input-name"></label><input type="text" id="input-name" value="Anna Smith">
                <hr>
                <span>Email: </span><label for="input-email"></label><input type="email" id="input-email" value="anna.smith@example.com">
                <hr>
                <span>Interests: </span><label for="input-interests"></label><input type="text" id="input-interests" value="coding">
                <hr>
                <button class="button" onclick="handleUpdateProfileRequest()">Update Profile</button>
            </div>

            <script>
                window.vmIpAddress = '${vmIpAddress}';
                
                (async function init() {
                    const ipAddress = window.vmIpAddress;
                    if (ipAddress) {
                        const response = await fetch(\`http://\${ipAddress}:3000/get-profile\`);
                        console.log("response", response);
                        const user = await response.json();
                        console.log(JSON.stringify(user));

                        document.getElementById('name').textContent = user.name ? user.name : 'Anna Smith';
                        document.getElementById('email').textContent = user.email ? user.email : 'anna.smith@example.com';
                        document.getElementById('interests').textContent = user.interests ? user.interests : 'coding';

                        const cont = document.getElementById('container');
                        cont.style.display = 'block';
                    } else {
                        console.error('Failed to get IP address');
                    }
                })();

                async function handleUpdateProfileRequest() {
                    const ipAddress = window.vmIpAddress;
                    if (!ipAddress) {
                        console.error('Failed to get IP address');
                        return;
                    }

                    const contEdit = document.getElementById('container-edit');
                    const cont = document.getElementById('container');

                    const payload = {
                        name: document.getElementById('input-name').value,
                        email: document.getElementById('input-email').value,
                        interests: document.getElementById('input-interests').value
                    };

                    const response = await fetch(\`http://\${ipAddress}:3000/update-profile\`, {
                        method: "POST",
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    const jsonResponse = await response.json();

                    document.getElementById('name').textContent = jsonResponse.name;
                    document.getElementById('email').textContent = jsonResponse.email;
                    document.getElementById('interests').textContent = jsonResponse.interests;

                    cont.style.display = 'block';
                    contEdit.style.display = 'none';
                }

                function updateProfile() {
                    const contEdit = document.getElementById('container-edit');
                    const cont = document.getElementById('container');

                    document.getElementById('input-name').value = document.getElementById('name').textContent;
                    document.getElementById('input-email').value = document.getElementById('email').textContent;
                    document.getElementById('input-interests').value = document.getElementById('interests').textContent;

                    cont.style.display = 'none';
                    contEdit.style.display = 'block';
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/profile-picture', function (req, res) {
  let img = fs.readFileSync(path.join(__dirname, "images/profile-1.jpg"));
  res.writeHead(200, {'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
});

// use when starting application locally
let mongoUrlLocal = "mongodb://admin:password@mongodb:27017";

// use when starting application as docker container
let mongoUrlDocker = "mongodb://admin:password@mongodb";

// pass these options to mongo client connect request to avoid DeprecationWarning for current Server Discovery and Monitoring engine
let mongoClientOptions = { useNewUrlParser: true, useUnifiedTopology: true };

// "user-account" in demo with docker. "my-db" in demo with docker-compose
let databaseName = "my-db";

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

app.get('/get-profile', function (req, res) {
  let response = {};
  // Connect to the db
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

app.listen(3000, function () {
  console.log("app listening on port 3000!");
});
