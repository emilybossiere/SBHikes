// ROUTES/INDEX.JS
var express = require("express");
var router = express.Router();
var passport = require("passport");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var asyncr = require("async");
var User = require("../models/user");
var Trail = require("../models/trail");
var Review = require("../models/review");


// app route page
router.get("/", function(req, res){
	res.render("landing");
});


//SHOW - display the register form
router.get("/register", function(req, res){
	res.render("register", {page: "register"});
});

//handle sign up logic
router.post("/register", function(req, res){
	var newUser = new User({
		username: req.body.username,
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email
	});
	if(req.body.adminCode === "exYNjFLw"){
		newUser.isAdmin = "true";
	}
	User.register(newUser, req.body.password, function(err, user){
		if(err){
  			req.flash("error", err.message);
  			return res.redirect("/register");
		}
		passport.authenticate("local")(req, res, function(){ //"local" strategy used, could be Google, Twitter, FB, etc.
			req.flash("success", "Welcome to SB Hikes, " + user.firstName + "!");
			res.redirect("/trails");
		});
	});
});

//SHOW - login form
router.get("/login", function(req, res){
	res.render("login", {page: "login"});
});

//handle login logic
//app.post("/login", middlware, callback)
router.post("/login", passport.authenticate("local", 
	{
	successRedirect: "/trails",
	failureRedirect: "/login",
	failureFlash: true
	}), function(req, res){
});

//logout route
router.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "Successfully logged out.");
	res.redirect("/trails");
});

//user profile route
router.get("/users/:id", function(req, res){
	User.findById(req.params.id, function(err, foundUser){
		if(err){
			req.flash("error", "Could not find user");	
			// res.redirect("/trails");
		} else {
			Trail.find().where("author.id").equals(foundUser._id).exec(function(err, trails){
			if(err){
				req.flash("error", "Something went wrong");	
				res.redirect("/trails");
			} else {
						res.render("users/show", {user: foundUser, trails: trails})
					}
				});
		}
	});
});

// ===== Password Reset by nax3t on github =====

//reset password - forgot password route
router.get("/forgot", function(req, res){
	res.render("forgot");
});

//reset password - email
router.post('/forgot', function(req, res, next) {
  asyncr.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'sbhikesandtrails@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'sbhikesandtrails@gmail.com',
        subject: 'SB Hikes Password Reset',
        text: 'You are receiving this because you have requested the reset of the password for your account.\n\n' +
          'Please click on the following link or paste it into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  asyncr.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'sbhikesandtrails@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'sbhikesandtrails.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Password successfully changed');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/trails');
  });
});

module.exports = router;