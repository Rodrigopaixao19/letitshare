const Post = require('../models/Post');


exports.viewCreateScreen = (req, res) => {
    res.render('create-post')
}

exports.create = (req, res) => {
    let post = new Post(req.body, req.session.user._id);
    post.create()
    .then((newId) => {
      req.flash('success', 'New post successfully created.')
      req.session.save(() => {
          res.redirect(`/post/${newId}`)
      })
    })
    .catch((errors) => {
        errors.forEach(error => req.flash('errors', error) )
        req.session.save(() => res.redirect('/create-post'))
    })
}

exports.apiCreate = (req, res) => {
    let post = new Post(req.body, req.apiUser._id);
    post.create()
    .then((newId) => {
      res.json('Congrats!');
    })
    .catch((errors) => {
        res.json(errors)
    })
}

exports.viewSingle = async function(req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId);
        res.render('single-post-screen', { post: post, title: post.title })
    } catch(error) {
        res.render('404')
    }
}

exports.viewEditScreen = async (req,res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        if (post.isVisitorOwner) {
          res.render("edit-post", {post: post})
        } else {
          req.flash("errors", "You do not have permission to perform that action.")
          req.session.save(() => res.redirect("/"))
        }
      } catch {
        res.render("404")
      }
}

exports.edit = async (req,res) => {
    let post = new Post(req.body, req.visitorId, req.params.id);
    post.update()
    .then((status) => {
        // the post was successfully updated in the database
        if(status == 'success') {
            // post was updated in db, everything went down perfectlly
            req.flash('success', 'Post sucessfully updated.');
            req.session.save(()=> {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
        else {
            // redirect user to the same edit screen and render errors
            post.errors.forEach((error) => {
                req.flash('errors', error)
            })
            req.session.save(() => {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
        // or user did have permission but there were validation errors
    })
    .catch(() => {
        // a post with the requestd id does not exist
        // or if the current visitor is not the owner of the request post
        req.flash('errors', 'You do not have permission to perform that action.')
        req.session.save(() => {
            res.redirect('/')
        })
    })
}

exports.delete = (req, res) => {
    Post.delete(req.params.id, req.visitorId)
    .then(() => {
        req.flash('success', 'Post successfully deleted.');
        req.session.save(() => res.redirect(`/profile/${req.session.user.username}`))
    })
    .catch(() => {
        req.flash('errors', 'You do not have permition to perform that action.');
        req.session.save(() => res.redirect('/'))
    })
}

exports.apiDelete = (req, res) => {
    Post.delete(req.params.id, req.apiUser._id)
    .then(() => {
       res.json('Success')
    })
    .catch(() => {
        res.json('You do not have permission to perform that action.')
    })
}

exports.search = (req, res) => {
    Post.search(req.body.searchTerm)
    .then(posts => {
        res.json(posts)
    })
    .catch(() => {
        res.json([]);
    })
}