const asyncHandler = require('express-async-handler');
const File = require('../models/fileModel');
const User = require('../models/userModel');
const fs = require('fs');
const path = require('path');

// @desc    Upload a file
// @route   POST /api/files
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload a file');
    }

    // Check if user has enough storage
    const user = await User.findById(req.user._id);
    if (user.usedStorage + req.file.size > user.storage) {
        // Delete the uploaded file
        fs.unlinkSync(req.file.path);
        res.status(400);
        throw new Error('Not enough storage space');
    }

    // Check for duplicate file
    const existingFile = await File.findOne({
        user: req.user._id,
        originalname: req.file.originalname,
        size: req.file.size
    });

    if (existingFile) {
        // Delete the newly uploaded file
        fs.unlinkSync(req.file.path);
        res.status(400);
        throw new Error('A file with the same name and size already exists');
    }

    const file = await File.create({
        user: req.user._id,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
    });

    // Update user's used storage
    user.usedStorage += req.file.size;
    await user.save();

    res.status(201).json({
        _id: file._id,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        createdAt: file.createdAt
    });
});

// @desc    Get user files
// @route   GET /api/files
// @access  Private
const getFiles = asyncHandler(async (req, res) => {
    const files = await File.find({ user: req.user._id })
        .select('_id filename originalname mimetype size createdAt');
    res.status(200).json(files);
});

// @desc    Download a file
// @route   GET /api/files/:id
// @access  Private
const downloadFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        res.status(404);
        throw new Error('File not found');
    }

    // Make sure user owns file
    if (file.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized');
    }

    // Check if file exists on filesystem
    if (!fs.existsSync(file.path)) {
        res.status(404);
        throw new Error('File not found on server');
    }

    // Set headers
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
});

// @desc    Delete a file
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        res.status(404);
        throw new Error('File not found');
    }

    // Make sure user owns file
    if (file.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized');
    }

    // Update user's used storage
    const user = await User.findById(req.user._id);
    user.usedStorage -= file.size;
    await user.save();

    try {
        // Delete file from filesystem if it exists
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        
        // Delete file from database
        await File.deleteOne({ _id: file._id });
        
        res.status(200).json({ 
            success: true,
            id: req.params.id 
        });
    } catch (error) {
        console.error('Error during file deletion:', error);
        res.status(500);
        throw new Error('Error deleting file');
    }
});

// @desc    Get file preview (thumbnail)
// @route   GET /api/files/:id/preview
// @access  Private
const getFilePreview = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        res.status(404);
        throw new Error('File not found');
    }

    // Make sure user owns file
    if (file.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized');
    }

    // Check if file exists on filesystem
    if (!fs.existsSync(file.path)) {
        res.status(404);
        throw new Error('File not found on server');
    }

    // Only serve preview for image files
    if (!file.mimetype.startsWith('image/')) {
        res.status(400);
        throw new Error('Preview only available for image files');
    }

    // Set headers
    res.setHeader('Content-Type', file.mimetype);
    
    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
});

module.exports = {
    uploadFile,
    getFiles,
    downloadFile,
    deleteFile,
    getFilePreview,
}; 