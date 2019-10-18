var mongoose = require("mongoose");

var reviewSchema = new mongoose.Schema({
	text: String,
	image: String,
	imageId: String,
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

module.exports = mongoose.model("Review", reviewSchema);