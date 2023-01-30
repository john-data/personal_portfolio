//importing modules for the app
const fs = require('fs');
var os = require('os');
var getDirName = require('path').dirname;
const passport = require("passport");
const twitchStrategy = require("passport-twitch.js").Strategy;
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const express = require("express");
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
//importing environment variables from linux -> pm2 ecoconfig -> node.js app
const twitchSigningSecret = process.env.TWITCH_SIGNING_SECRET;
const clientid = process.env.TWITCH_CLIENT_ID;
const clientSec = process.env.TWITCH_CLIENT_SECRET;
const cbURL = process.env.TWITCH_CALLBACK_URL;
const cookieSecret = process.env.PASSPORT_COOKIE_SECRET;

//buffer variable to grab tokens when authorization (oauth permissions) and write to file
var bufferString;

//define express app and set port to 3000
const app = express();
const port = process.env.PORT || 3000;

//MIDDLEWARE (for views location/engine, cookie and body parser,
//passport initialization)
app.set("views", "./views")
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cookieSession({secret: cookieSecret}));
app.use(passport.initialize());
app.use(express.static("public"));

//ROUTING
app.get("/", (req, res) => {
  res.render("pages/home");
});
app.get("/login", function (req, res) {
    res.render("pages/login");
});
app.get("/failure", function(req, res){
  res.render("pages/failure");
});
app.get("/success", function async (req, res){
  fs.appendFileSync('tokens/access.csv', bufferString + os.EOL);
  res.render("pages/success");
});
app.get("/auth/twitch", passport.authenticate("twitch.js", {forceVerify: true}));
app.get("/auth/twitch/callback", passport.authenticate("twitch.js", { failureRedirect: "/failure" }),
  function(req, res) {
  //Successful auth - print to console and redirect user
  req.session.user = req.user;
  console.log(req.user);
  console.log(req.query);
  res.redirect("/success");
});


//PASSPORT INITIALIZE
//create a new twitch strategy by calling passport, passing credentials to twitch
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      'Client-ID': clientid,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'Bearer ' + accessToken
    }
  };
  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body));
    } else {
      done(JSON.parse(body));
    }
  });
}

//passport configuring for response_code and posting for access Token
passport.use(new twitchStrategy({
  authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
  tokenURL: 'https://id.twitch.tv/oauth2/token',
  clientID: clientid,
  clientSecret: clientSec,
  callbackURL: cbURL,
  scope: "bits:read channel:read:goals channel:read:hype_train channel:read:redemptions channel:read:subscriptions",
  state: true
  },
 function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    bufferString =profile.login + "," + profile.accessToken + "," + profile.refreshToken;
    return done(null, profile);   
 }
));



//serialize/deserialize user session
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});


//start the application listener using port 3000
const listener = app.listen(port, () => {
  console.log("The EventSub Application has started listening on port: " + listener.address().port);
});

//verify event received is from twitch and not anyone else
const verifyTwitchSignature = (req, res, buf, encoding) => {
  const messageId = req.header("Twitch-Eventsub-Message-Id");
  const timestamp = req.header("Twitch-Eventsub-Message-Timestamp");
  const messageSignature = req.header("Twitch-Eventsub-Message-Signature");
  const time = Math.floor(new Date().getTime() / 1000);
  console.log(`Message ${messageId} Signature: `, messageSignature);
  //if it takes over 10 minutes then print "failure" and throw error
  if (Math.abs(time - timestamp) > 600) {
    // needs to be < 10 minutes
    console.log(`Verification Failed: timestamp > 10 minutes. Message Id: ${messageId}.`);
    throw new Error("Ignore this request.");
  }
  //check if the signing secret has a value. 
  if (!twitchSigningSecret) {
    console.log(`Twitch signing secret is empty.`);
    throw new Error("Twitch signing secret is empty.");
  }
  //compute hash from secret, messageId, timestamp
  const computedSignature =
    "sha256=" +
    crypto
      .createHmac("sha256", twitchSigningSecret)
      .update(messageId + timestamp + buf)
      .digest("hex");
  console.log(`Message ${messageId} Computed Signature: `, computedSignature);
  //check if twitch signature == our server signature
  if (messageSignature !== computedSignature) {
    throw new Error("Invalid signature.");
  } else {
    console.log("Verification successful");
  }
};

//instantiate verify signature
app.use(express.json({ verify: verifyTwitchSignature }));


//ASYNC FUNC that post response from twitch to /webhooks/callback
app.post("/webhooks/callback", async (req, res) => {

  //check if message is a callback verification
  //if yes, return the requests body.challenge
  const messageType = req.header("Twitch-Eventsub-Message-Type");
  if (messageType === "webhook_callback_verification") {
    console.log("Webhook verified by twitch");
  return res.status(200).send(req.body.challenge);
  }
    

  //define type and event
  const { type } = req.body.subscription;
  const { event } = req.body;

  //define paths and naming convention for diff events
  
  const cFollow = `/home/bitnami/jsons/c_follow_${Date.now()}.json`;
  const cUpdate = `/home/bitnami/jsons/c_update/c_update_${Date.now()}.json`;
  const cSub = `/home/bitnami/jsons/c_sub/c_sub_${Date.now()}.json`;
  const cSubEnd = `/home/bitnami/jsons/c_sub_end/c_sub_end_${Date.now()}.json`;
  const cSubGift = `/home/bitnami/jsons/c_sub_gift/c_sub_gift_${Date.now()}.json`;
  const cCheer = `/home/bitnami/jsons/c_cheer/c_cheer_${Date.now()}.json`;
  const cRaid = `/home/bitnami/jsons/c_raid/c_raid_${Date.now()}.json`;
  const cHypeStart = `/home/bitnami/jsons/c_hype_start/c_hype_start_${Date.now()}.json`;
  const cHypeEnd = `/home/bitnami/jsons/c_hype_end/c_hype_end_${Date.now()}.json`;
  const sOnline = `/home/bitnami/jsons/stream_on/stream_on_${Date.now()}.json`;
  const sOffline = `/home/bitnami/jsons/stream_off/stream_off_${Date.now()}.json`;
  const cGoalStart = `/home/bitnami/jsons/c_goal_start/c_goal_start_${Date.now()}.json`;
  const cGoalEnd = `/home/bitnami/jsons/c_goal_end/c_goal_end_${Date.now()}.json`;

  //if else to determine file name and location depending on type of event
  if (type == "channel.follow") {
    console.log(`Writing to a tmp file: ${cFollow}`);
    fs.writeFileSync(cFollow, JSON.stringify(event));
  } else if (type == "channel.update") {
    console.log(`Writing to a tmp file: ${cUpdate}`);
    fs.writeFileSync(cUpdate, JSON.stringify(event));
  } else if (type == "channel.subscribe") {
    console.log(`Writing to a tmp file: ${cSub}`);
    fs.writeFileSync(cSub, JSON.stringify(event));
  } else if (type == "channel.subscribe.end") {
    console.log(`Writing to a tmp file: ${cSubEnd}`);
    fs.writeFileSync(cSubEnd, JSON.stringify(event));
  } else if (type == "channel.subscribe.gift") {
    console.log(`Writing to a tmp file: ${cSubGift}`);
    fs.writeFileSync(cSubGift, JSON.stringify(event));
  } else if (type == "channel.cheer") {
    console.log(`Writing to a tmp file: ${cCheer}`);
    fs.writeFileSync(cCheer, JSON.stringify(event));
  } else if (type == "channel.raid") {
    console.log(`Writing to a tmp file: ${cRaid}`);
    fs.writeFileSync(cRaid, JSON.stringify(event));
  } else if (type == "channel.hype_train.begin") {
    console.log(`Writing to a tmp file: ${cHypeStart}`);
    fs.writeFileSync(cHypeStart, JSON.stringify(event));
  } else if (type == "channel.hype_train.end") {
    console.log(`Writing to a tmp file: ${cHypeEnd}`);
    fs.writeFileSync(cHypeEnd, JSON.stringify(event));
  } else if (type == "stream.online") {
    console.log(`Writing to a tmp file: ${sOnline}`);
    fs.writeFileSync(sOnline, JSON.stringify(event));
  } else if (type == "stream.offline") {
    console.log(`Writing to a tmp file: ${sOffline}`);
    fs.writeFileSync(sOffline, JSON.stringify(event));
  } else if (type == "channel.goal.begin") {
    console.log(`Writing to a tmp file: ${cGoalStart}`);
    fs.writeFileSync(cGoalStart, JSON.stringify(event));
  } else if (type == "channel.goal.end") {
    console.log(`Writing to a tmp file: ${cGoalEnd}`);
    fs.writeFileSync(cGoalEnd, JSON.stringify(event));
  }
  
  //print to event to console
  console.log(
    `A ${type} event for ${event.broadcaster_user_name}: `,
    event
  );

  //respond to twitch with status 200
  res.status(200).end();
});
