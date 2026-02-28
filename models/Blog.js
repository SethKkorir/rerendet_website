import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Blog title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    content: {
        type: String,
        required: [true, 'Blog content is required']
    },
    excerpt: {
        type: String,
        maxlength: [500, 'Excerpt cannot exceed 500 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    featuredImage: {
        public_id: String,
        url: String
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        default: 'Coffee'
    },
    tags: [String],
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    publishedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Pre-save middleware to generate slug
blogSchema.pre('save', async function (next) {
    if (this.isModified('title') || !this.slug) {
        let baseSlug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();

        // Check for uniqueness
        const existingBlog = await mongoose.model('Blog').findOne({
            slug: baseSlug,
            _id: { $ne: this._id }
        });

        if (existingBlog) {
            this.slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
        } else {
            this.slug = baseSlug;
        }
    }

    if (this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    next();
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
