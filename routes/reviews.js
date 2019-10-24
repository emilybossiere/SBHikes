var express = require("express");
var router = express.Router({ mergeParams: true });
var Trail = require("../models/trail");
var Review = require("../models/review");
var middleware = require("../middleware/index");
var multer = require("multer");
var cloudinary = require("cloudinary");

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function(req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error("Only image files may be uploaded"), false);
  }
  cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter });

//CLOUDINARY CONFIGURATION
cloudinary.config({
  cloud_name: "daqc0ga76",
  api_key: 452294335971968,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//Reviews INDEX route
router.get("/", function(req, res) {
  Trail.findById(req.params.id)
    .populate({
      path: "reviews",
      options: { sort: { createdAt: -1 } } // sorting the populated reviews array to show the latest first
    })
    .exec(function(err, trail) {
      if (err || !trail) {
        req.flash("error", err.message);
        return res.redirect("back");
      }
      res.render("reviews/index", { trail: trail });
    });
});

//NEW - add a new review
router.get(
  "/new",
  middleware.isLoggedIn,
  middleware.checkReviewExistence,
  function(req, res) {
    // (middleware.checkReviewExistence checks if a user already reviewed the campground, only one review per user is allowed)
    //find trail by id
    Trail.findById(req.params.id, function(err, trail) {
      if (err) {
        req.flash("error", err.message);
        res.redirect("back");
      } else {
        res.render("reviews/new", { trail: trail });
      }
    });
  }
);

//CREATE - create new review
router.post(
  "/",
  middleware.isLoggedIn,
  middleware.checkReviewExistence,
  upload.single("image"),
  function(req, res) {
    //look up trail by id
    Trail.findById(req.params.id)
      .populate("reviews")
      .exec(function(err, trail) {
        if (err) {
          req.flash("error", err.message);
          return res.redirect("back");
        } //req.body.review already has review.author and review.text bc of the way it's set up in reviews/new.ejs like review[text], etc
        if (req.file) {
          cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
            //add cloudinary url for img to the trail object under img property
            req.body.review.image = result.secure_url;
            // add image's public id to trail object
            req.body.review.imageId = result.public_id;
            //add author to trail
            req.body.review.author = {
              id: req.user._id,
              username: req.user.username
            };
          }); // cloudinary
        }

        Review.create(req.body.review, function(err, review) {
          if (err) {
            req.flash("error", "Something went wrong, please try again.");
            res.redirect("back");
          } else {
            //add username and id to review first
            review.author.id = req.user._id; //review.author.id comes from the review model, req.user._id comes from mongoose generated info
            review.author.username = req.user.username;
            review.trail = trail;
            //save review
            review.save();
            //add new review to found trail
            trail.reviews.push(review);
            // calculate the new average review for the campground
            trail.rating = calculateAverage(trail.reviews);
            //save trail
            trail.save();
            req.flash("success", "Your review has been successfully added");
            res.redirect("/trails/" + trail._id);
          }
        }); //review.create
      });
  }
);

//EDIT review
router.get("/:review_id/edit", middleware.checkReviewOwner, function(req, res) {
  //req.params.id - this is the id for trails
  Review.findById(req.params.review_id, function(err, foundReview) {
    if (err) {
      req.flash("error", err.message);
      res.redirect("back");
    } else {
      res.render("reviews/edit", {
        trail_id: req.params.id,
        review: foundReview
      });
    }
  });
});

//UPDATE review
router.put(
  "/:review_id",
  middleware.checkReviewOwner,
  upload.single("image"),
  function(req, res) {
    //req.params.review_id is the mongoose id, req.body.review is the info taken from the form in reviews/edit.ejs
    Review.findById(req.params.review_id, { new: true }, async function(
      err,
      review
    ) {
      if (err) {
        req.flash("error", err.message);
        res.redirect("back");
      } else {
        if (req.file) {
          try {
            await cloudinary.v2.uploader.destroy(review.imageId);
            var result = await cloudinary.v2.uploader.upload(req.file.path);
            review.imageId = result.public_id;
            review.image = result.secure_url;
          } catch {
            if (err) {
              req.flash("error", err.message);
              return res.redirect("back");
            }
          }
        }
        Trail.findById(req.params.id)
          .populate("reviews")
          .exec(function(err, trail) {
            if (err) {
              req.flash("error", err.message);
              return res.redirect("back");
            }
            // recalculate trail review average
            trail.rating = calculateAverage(trail.reviews);
            //update text whether it was changed or not
            review.text = req.body.review.text;
            //save trail in the database to update
            review.save();
            //redirect back to show page
            req.flash("success", "Successfully updated review");
            res.redirect("/trails/" + req.params.id);
          });
      }
    });
  }
);

//DESTROY review
router.delete("/:review_id", middleware.checkReviewOwner, function(req, res) {
  Review.findById(req.params.review_id, async function(err, review) {
    if (err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
      await cloudinary.v2.uploader.destroy(review.imageId);
      Trail.findByIdAndUpdate(
        req.params.id,
        { $pull: { reviews: req.params.review._id } },
        { new: true }
      )
        .populate("reviews")
        .exec(function(err, trail) {
          review.remove();
          // recalculate review average
          trail.rating = calculateAverage(trail.reviews);
          //save changes
          trail.save();
          req.flash("success", "Successfully deleted review");
          res.redirect("/trails/" + req.params.id);
        });
    } catch (err) {
      if (err) {
        req.flash("error", err.message);
        res.redirect("/trails/" + req.params.id);
      }
    }
  });
});

function calculateAverage(reviews) {
  if (reviews.length === 0) {
    return 0;
  }
  var sum = 0;
  reviews.forEach(function(element) {
    sum += element.rating;
  });
  return sum / reviews.length;
}

module.exports = router;
