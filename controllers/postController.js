const Post = require('../models/Post');


exports.viewCreateScreen = (req, res) => {
    res.render('create-post')
}

exports.create = (req, res) => {
    let post = new Post(req.body, req.session.user._id);
    post.create()
    .then(() => {
      res.send('new post created')  
    })
    .catch((errors) => {
     res.send(errors)
    })
}

exports.viewSingle = async function(req, res) {
    try {
        let post = await Post.findSingleById(req.params.id);
        res.render('single-post-screen', { post: post })
    } catch(error) {
        res.render('404')
    }
}