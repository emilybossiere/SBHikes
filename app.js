require("dotenv").config();

var express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  flash = require("connect-flash"),
  passport = require("passport"),
  LocalStrategy = require("passport-local"),
  methodOverride = require("method-override"),
  Trail = require("./models/trail"),
  Review = require("./models/review"),
  Comment = require("./models/comment"),
  User = require("./models/user");

//requiring routes
var trailRoutes = require("./routes/trails"),
  reviewRoutes = require("./routes/reviews"),
  commentRoutes = require("./routes/comments"),
  indexRoutes = require("./routes/index");

mongoose.connect("mongodb://localhost:27017/sb_hikes", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");

//Passport config
app.use(
  require("express-session")({
    secret: "Jack was the best dog ever",
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//app.use custom middleware to add currentUser to every template
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

//use the routes required above
app.use(indexRoutes);
app.use("/trails", trailRoutes);
app.use("/trails/:id/comments", commentRoutes);
app.use("/trails/:id/reviews", reviewRoutes);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("SBHikes server started on port 3000!");
});
