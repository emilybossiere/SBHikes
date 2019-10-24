// MIDDLEWARE/INDEX.JS
var Trail = require("../models/trail");
var Review = require("../models/review");
var Comment = require("../models/comment");

//all middleware
var middlewareObj = {};

middlewareObj.checkPostOwner = function(req, res, next) {
  if (req.isAuthenticated()) {
    Trail.findById(req.params.id, function(err, foundTrail) {
      if (err) {
        req.flash("error", "Could not find that trail");
        res.redirect("back");
      } else {
        //does user own that post
        if (foundTrail.author.id.equals(req.user._id) || req.user.isAdmin) {
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

middlewareObj.checkReviewOwner = function(req, res, next) {
  if (req.isAuthenticated()) {
    Review.findById(req.params.review_id, function(err, foundReview) {
      if (err) {
        res.redirect("back");
      } else {
        //does user own that review
        if (foundReview.author.id.equals(req.user._id) || req.user.isAdmin) {
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

middlewareObj.checkCommentOwner = function(req, res, next) {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, function(err, foundComment) {
      if (err) {
        res.redirect("back");
      } else {
        //does user own that comment
        if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
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

middlewareObj.isLoggedIn = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You must be logged in to do that.");
  res.redirect("/login");
};

middlewareObj.isAdmin = function(req, res, next) {
  if (req.isAuthenticated()) {
    Trail.findById(req.params.id, function(err, foundTrail) {
      if (err) {
        req.flash("error", "Could not find that trail");
        res.redirect("back");
      } else {
        //does user own that post
        if (req.user.isAdmin) {
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

middlewareObj.checkReviewExistence = function(req, res, next) {
  if (req.isAuthenticated()) {
    Trail.findById(req.params.id)
      .populate("reviews")
      .exec(function(err, foundTrail) {
        if (err || !foundTrail) {
          req.flash("error", "Trail not found.");
          res.redirect("back");
        } else {
          // check if req.user._id exists in foundTrail.reviews
          var foundUserReview = foundTrail.reviews.some(function(review) {
            return review.author.id.equals(req.user._id);
          });
          if (foundUserReview) {
            req.flash("error", "You cannot leave more than one review");
            return res.redirect("/trails/" + foundTrail._id);
          }
          // if the review was not found, move on
          next();
        }
      });
  } else {
    req.flash("error", "You need to login first.");
    res.redirect("back");
  }
};

module.exports = middlewareObj;
