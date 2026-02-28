// components/Admin/BlogManagement.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaSearch, FaPlus, FaEdit, FaTrash, FaNewspaper, FaUpload,
    FaTimes, FaTag, FaStar, FaEye, FaCheck, FaSync, FaPenNib, FaFileAlt
} from 'react-icons/fa';
import './BlogManagement.css';

const BlogManagement = () => {
    const { showNotification, token } = useContext(AppContext);
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', category: 'all' });
    const [showModal, setShowModal] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);

    const fetchBlogs = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/blogs/admin/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setBlogs(data.data);
        } catch {
            showNotification('Failed to load blogs', 'error');
        } finally {
            setLoading(false);
        }
    }, [token, showNotification]);

    useEffect(() => {
        if (token) fetchBlogs();
    }, [fetchBlogs, token]);

    const handleQuickPublish = async (id) => {
        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'published' })
            });
            const data = await res.json();
            if (data.success) {
                showNotification('Story published successfully!', 'success');
                fetchBlogs();
            }
        } catch {
            showNotification('Failed to publish story', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this blog post?')) return;
        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showNotification('Blog deleted', 'success');
                fetchBlogs();
            }
        } catch {
            showNotification('Delete failed', 'error');
        }
    };

    const filteredBlogs = blogs.filter(b => {
        const matchesSearch = b.title.toLowerCase().includes(filters.search.toLowerCase());
        const matchesCategory = filters.category === 'all' || b.category === filters.category;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', ...new Set(blogs.map(b => b.category))];

    return (
        <div className="blog-management">
            <div className="pm-header">
                <div>
                    <h1 className="pm-title">Blog Management</h1>
                    <p className="pm-subtitle">{blogs.length} posts total</p>
                </div>
                <button className="btn-add-product" onClick={() => { setEditingBlog(null); setShowModal(true); }}>
                    <FaPlus /> New Post
                </button>
            </div>

            <div className="pm-filters">
                <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <div className="category-pills">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`cat-pill ${filters.category === cat ? 'active' : ''}`}
                            onClick={() => setFilters({ ...filters, category: cat })}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="pm-loading"><div className="pm-spinner" /><p>Loading blogs…</p></div>
            ) : filteredBlogs.length === 0 ? (
                <div className="pm-empty">
                    <FaNewspaper className="empty-icon" />
                    <h3>No blog posts found</h3>
                    <p>Create your first story to share with your customers</p>
                </div>
            ) : (
                <div className="blog-grid">
                    {filteredBlogs.map((blog, i) => (
                        <motion.div
                            key={blog._id}
                            className="blog-admin-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <div className="blog-card-img">
                                {blog.featuredImage?.url ? (
                                    <img src={blog.featuredImage.url} alt={blog.title} />
                                ) : (
                                    <div className="blog-img-placeholder"><FaNewspaper /></div>
                                )}
                                <span className={`blog-status-badge ${blog.status}`}>{blog.status}</span>
                            </div>
                            <div className="blog-card-body">
                                <span className="blog-card-cat">{blog.category}</span>
                                <h4>{blog.title}</h4>
                                <p className="blog-card-excerpt">{blog.excerpt || 'No excerpt provided...'}</p>
                                <div className="blog-card-meta">
                                    <span><FaEye /> {blog.views} views</span>
                                    <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="blog-card-actions">
                                    <button className="btn-card-action edit" onClick={() => { setEditingBlog(blog); setShowModal(true); }}>
                                        <FaEdit /> Edit
                                    </button>
                                    {blog.status === 'draft' && (
                                        <button className="btn-card-action publish" onClick={() => handleQuickPublish(blog._id)}>
                                            <FaCheck /> Publish
                                        </button>
                                    )}
                                    <button className="btn-card-action delete" onClick={() => handleDelete(blog._id)}>
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <BlogModal
                        blog={editingBlog}
                        token={token}
                        onClose={() => setShowModal(false)}
                        onSave={() => { fetchBlogs(); setShowModal(false); }}
                        showNotification={showNotification}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const BlogModal = ({ blog, token, onClose, onSave, showNotification }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: blog?.title || '',
        content: blog?.content || '',
        excerpt: blog?.excerpt || '',
        category: blog?.category || 'Coffee',
        status: blog?.status || 'draft',
        isFeatured: blog?.isFeatured || false,
        tags: blog?.tags?.join(', ') || ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(blog?.featuredImage?.url || '');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e, action = 'publish') => {
        if (e) e.preventDefault();
        if (!formData.title || !formData.content) {
            showNotification('Title and content are required', 'error');
            return;
        }

        setLoading(true);
        try {
            let imageUrl = blog?.featuredImage?.url || '';
            if (imageFile) {
                const fd = new FormData();
                fd.append('logo', imageFile); // Using the general purpose upload logo endpoint for simplicity if it works for blogs
                const uploadRes = await fetch('/api/admin/upload/logo', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) imageUrl = uploadData.data.url;
            }

            const finalStatus = action === 'draft' ? 'draft' : formData.status;

            const payload = {
                ...formData,
                status: finalStatus,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                featuredImage: { url: imageUrl }
            };

            const url = blog ? `/api/blogs/${blog._id}` : '/api/blogs';
            const method = blog ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                showNotification(action === 'draft' ? 'Draft saved successfully' : (blog ? 'Blog updated' : 'Blog published'), 'success');
                onSave();
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            showNotification(err.message || 'Operation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pm-modal-overlay blog-drawer-overlay" onClick={onClose}>
            <motion.div
                className="blog-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="pm-modal-header">
                    <div className="pm-modal-title">
                        <div className="pm-modal-icon"><FaPenNib /></div>
                        <h2>{blog ? 'Edit Blog Post' : 'Create New Blog Post'}</h2>
                    </div>
                    <button className="pm-close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <form onSubmit={handleSubmit} className="pm-modal-body blog-form-grid">
                    <div className="blog-form-main">
                        <div className="pm-field">
                            <label>Post Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter a catchy title..."
                                required
                            />
                        </div>
                        <div className="pm-field">
                            <label>Content (HTML supported)</label>
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                rows={15}
                                placeholder="Write your story here..."
                                required
                            />
                        </div>
                    </div>

                    <div className="blog-form-sidebar">
                        <div className="pm-field">
                            <label>Featured Image</label>
                            <div className="blog-image-upload" onClick={() => document.getElementById('blog-img-input').click()}>
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" />
                                ) : (
                                    <div className="upload-placeholder">
                                        <FaUpload />
                                        <span>Click to upload</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="blog-img-input"
                                    hidden
                                    onChange={handleImageChange}
                                    accept="image/*"
                                />
                            </div>
                        </div>

                        <div className="pm-field">
                            <label>Short Excerpt</label>
                            <textarea
                                value={formData.excerpt}
                                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                                rows={3}
                                placeholder="A brief summary for the cards..."
                            />
                        </div>

                        <div className="pm-field">
                            <label>Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Coffee">Coffee</option>
                                <option value="Recipes">Recipes</option>
                                <option value="Farming">Farming</option>
                                <option value="Culture">Culture</option>
                                <option value="Events">Events</option>
                            </select>
                        </div>

                        <div className="pm-field">
                            <label>Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>

                        <div className="pm-field">
                            <label>Tags (comma separated)</label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="coffee, brew, kenya"
                            />
                        </div>

                        <div className="blog-form-actions">
                            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                            <button
                                type="button"
                                className="btn-save-draft"
                                onClick={(e) => handleSubmit(e, 'draft')}
                                disabled={loading}
                            >
                                {loading ? <FaSync className="st-spin" /> : <FaFileAlt />}
                                Save Draft
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                                onClick={(e) => handleSubmit(e, 'publish')}
                            >
                                {loading ? <FaSync className="st-spin" /> : <FaCheck />}
                                {blog ? 'Update & Sync' : 'Publish Story'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default BlogManagement;
