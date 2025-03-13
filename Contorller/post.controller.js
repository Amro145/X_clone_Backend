import User from "../Models/auth.model.js"
import Notification from "../Models/notification.model.js"
import Post from "../Models/post.model.js"
import { v2 as cloudinary } from "cloudinary"

export const createPost = async (req, res) => {
    try {
        const { text } = req.body
        let { image } = req.body
        const myId = req.user._id
        const me = await User.findById(myId)
        if (!me) {
            return res.status(400).json({ message: "User Not Found" })
        }
        if (!text && !image) {
            return res.status(400).json({ message: "Post should be have text or image" })
        }
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image)
            image = uploadResponse.secure_url
        }
        const newPost = new Post({
            user: myId,
            text,
            image,
        })
        await newPost.save()
        return res.status(201).json({ newPost, message: "create post succuflly" })


    } catch (error) {
        console.log("error in create post", error);
        return res.status(500).json({ message: "error in create post" })
    }
}
export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id
        const post = await Post.findById(postId)
        if (!post) {
            return res.status(404).json({ message: " post not found   " })
        }
        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "You are not authorized" })
        }
        if (post.image) {
            const imageId = post.image.split("/").pop().split(".")[0]
            await cloudinary.uploader.destroy(imageId)
        }
        await Post.findByIdAndDelete(post._id)
        return res.status(200).json({ message: "Post deleted succufully" })

    } catch (error) {
        console.log("error in delete post", error);
        return res.status(500).json({ message: "error in delete post" })
    }
}
export const commentOnPost = async (req, res) => {
    try {
        const me = req.user
        const postId = req.params.id
        const { text } = req.body

        const post = await Post.findById(postId)
        const allpost = await Post.find()
        if (!post) {
            return res.status(404).json({ message: "post not found " })
        }
        const comment = { user: me._id, text }
        post.comment.push(comment)
        await post.save()
        const posts = await Post.find()
        return res.status(201).json({ posts, message: "comment added succefuly" })
    } catch (error) {
        console.log("error in add comment", error);
        return res.status(500).json({ message: "error in add comment" })
    }
}
export const likeUnlike = async (req, res) => {
    try {
        const me = req.user
        const postId = req.params.id
        const post = await Post.findById(postId)
        if (!post) {
            return res.status(404).json({ message: "post not found" })
        }
        const isLike = post.likes.includes(me._id)
        if (!isLike) {
            await Post.updateOne({ _id: postId }, { $push: { likes: me._id } })
            await User.updateOne({ _id: me._id }, { $push: { likedPosts: postId } })
            if (me._id.toString() !== post.user.toString()) {
                const newnotifiction = new Notification({
                    from: me._id,
                    to: post.user,
                    type: "like"
                })
                await newnotifiction.save()
            }
            const posts = await Post.find().sort({ createdAt: -1 })
                .populate({ path: "user", select: "-password" })
                .populate({ path: "comment.user", select: "-password" })
            const postsToCheckLike = await Post.find()

            return res.status(200).json({ posts, postsToCheckLike, status: true })
        } else {
            await Post.updateOne({ _id: postId }, { $pull: { likes: me._id } })
            await User.updateOne({ _id: me._id }, { $pull: { likedPosts: postId } })
            const postsToCheckLike = await Post.find()
            const posts = await Post.find().sort({ createdAt: -1 })
                .populate({ path: "user", select: "-password" })
                .populate({ path: "comment.user", select: "-password" })

            return res.status(200).json({ posts, status: false })

        }
    } catch (error) {
        console.log("error in  like/unlike", error);
        return res.status(500).json({ message: "error in like/unlike" })
    }
}
export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "comment.user", select: "-password" })
        const postsToCheckLike = await Post.find()

        if (posts.length === 0) {
            return res.status(200).json([])
        }
        return res.status(200).json({ message: "get all post success", posts, postsToCheckLike })

    } catch (error) {

        console.log("error in  get all post", error);
        return res.status(500).json({ message: "error in get all post" })
    }
}
export const getOnePost = async (req, res) => {
    try {
        const { id } = req.params
        const post = await Post.findById(id).sort({ createdAt: -1 })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "comment.user", select: "-password" })
        if (!post) {
            return res.status(400).json({ message: "Invalid Id" })
        }
        return res.status(200).json({ message: "get one post success", post })

    } catch (error) {

        console.log("error in  one all post", error);
        return res.status(500).json({ message: "error in get one post" })
    }
}
export const getLikedPosts = async (req, res) => {
    try {
        const me = req.user
        if (!me) return res.status(494).json({ message: "user not found" })

        const posts = await Post.find({ _id: { $in: me.likedPosts } })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "likes", select: "-password" })
            .populate({ path: "comment.user", select: "-password" })
        return res.status(200).json(posts)
    } catch (error) {
        console.log("error in  get liked post", error);
        return res.status(500).json({ message: "error in get liked post" })

    }

}
export const getFollowingPosts = async (req, res) => {
    try {
        const myId = req.user._id
        const me = await User.findById(myId)
        if (!me) return res.status(404).json({ message: "user not found" })
        const myfollowingId = me.following
        const followingPosts = await Post.find({ user: { $in: myfollowingId } })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "likes", select: "-password" })
            .populate({ path: "comment.user", select: "-password" })
        return res.status(200).json({ followingPosts, message: "get following Post success" })
    } catch (error) {
        console.log("error in  get following post", error);
        return res.status(500).json({ message: "error in get following post" })


    }
}
export const getUserPosts = async (req, res) => {
    try {
        const userId = req.params.userid
        const user = await User.findById(userId)
        const userPosts = await Post.find({ user: { $in: user._id } })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "likes", select: "-password" })
            .populate({ path: "comment.user", select: "-password" })
        res.status(200).json({ userPosts, message: "get user postes success" })
    } catch (error) {
        console.log("error in  get user post", error);
        return res.status(500).json({ message: "error in get user post" })


    }
}