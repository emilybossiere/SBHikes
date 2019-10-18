var mongoose = require("mongoose");

//Schema setup
var trailSchema = new mongoose.Schema({
	name: String,
	image: String,
	imageId: String,
	description: String,
	distance: String,
	elevation: String,
	createdAt: {
		type: Date,
		default: Date.now
	},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	reviews: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Review" //name of the model
		}
	]
});

module.exports = mongoose.model("Trail", trailSchema);