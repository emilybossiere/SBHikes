// MIDDLEWARE/INDEX.JS
var Trail = require("../models/trail");
var Review = require("../models/review");

//all middleware
var middlewareObj = {};

middlewareObj.checkPostOwner = function(req, res, next){
	if (req.isAuthenticated()){
		Trail.findById(req.params.id, function(err, foundTrail){
			if(err){
				req.flash("error", "Could not find that trail");
				res.redirect("back");
			} else {
				//does user own that post
				if(foundTrail.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				} else {
					req.flash("error", "You don't have permission to do that");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You must be logged in to do that.");
		res.redirect("/login");
	}
};


middlewareObj.checkReviewOwner = function(req, res, next){
	if (req.isAuthenticated()){
		Review.findById(req.params.review_id, function(err, foundReview){
			if(err){
				res.redirect("back");
			} else {
				//does user own that review
				if(foundReview.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				} else {
					req.flash("error", "You don't have permission to do that.");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You must be logged in to do that.");
		res.redirect("/login");
	}	
};

middlewareObj.isLoggedIn = function(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "You must be logged in to do that.");
	res.redirect("/login");
};

middlewareObj.isAdmin = function(req, res, next){
	if (req.isAuthenticated()){
		Trail.findById(req.params.id, function(err, foundTrail){
			if(err){
				req.flash("error", "Could not find that trail");
				res.redirect("back");
			} else {
				//does user own that post
				if(req.user.isAdmin){
					next();
				} else {
					req.flash("error", "You don't have permission to do that");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You must be logged in to do that.");
		res.redirect("/login");
	}
};


module.exports = middlewareObj;