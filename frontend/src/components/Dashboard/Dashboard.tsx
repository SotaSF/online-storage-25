import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Container,
    Box,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
    LinearProgress,
    Paper,
    Alert,
    Grid,
    useTheme,
    Divider,
    Tooltip,
    Avatar,
    ListItemAvatar,
    Breadcrumbs,
    Link,
} from '@mui/material';
import {
    Delete,
    CloudUpload,
    Download,
    Logout,
    Storage,
    InsertDriveFile,
    Image,
    PictureAsPdf,
    AudioFile,
    VideoFile,
    Description,
    Code,
    ArrowBack,
} from '@mui/icons-material';
import ReactDOM from 'react-dom';
import FolderList from '../Folder/FolderList';

interface File {
    _id: string;
    originalname: string;
    size: number;
    createdAt: string;
    mimetype?: string;
}

interface Folder {
    _id: string;
    name: string;
    path: string;
}

interface StorageResponse {
    usedStorage: number;
    storage: number;
}

interface FolderContents {
    folders: Folder[];
    files: File[];
}

const Dashboard: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: 'Root' }]);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [storageUsed, setStorageUsed] = useState(0);
    const [storageLimit, setStorageLimit] = useState(0);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    
    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetchFolderContents(currentFolder);
        fetchStorageInfo();
    }, [token, navigate, currentFolder]);

    const config = {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const fetchFolderContents = async (folderId: string | null) => {
        try {
            const response = await axios.get<FolderContents>(
                `http://localhost:5000/api/folders/${folderId || 'root'}/contents`,
                config
            );
            setFolders(response.data.folders);
            setFiles(response.data.files);
            setError('');
        } catch (err: any) {
            console.error('Error fetching folder contents:', err);
            setError(err.response?.data?.message || 'Error fetching folder contents');
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        }
    };

    const fetchStorageInfo = async () => {
        try {
            const response = await axios.get<StorageResponse>('http://localhost:5000/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Convert to numbers and provide fallbacks
            const usedStorage = typeof response.data.usedStorage === 'number' ? response.data.usedStorage : 0;
            const totalStorage = typeof response.data.storage === 'number' ? response.data.storage : 104857600; // 100MB
            
            setStorageUsed(usedStorage);
            setStorageLimit(totalStorage);
            setError('');
        } catch (err: any) {
            console.error('Error fetching storage info:', err);
            // Don't show error to user, just set defaults
            setStorageUsed(0);
            setStorageLimit(104857600); // Default to 100MB
        }
    };

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            setError(`File size exceeds 50MB limit. Please choose a smaller file.`);
            event.target.value = '';
            return;
        }

        // Check if upload would exceed storage limit
        if (storageUsed + file.size > storageLimit) {
            setError(`Not enough storage space. Please free up some space and try again.`);
            event.target.value = '';
            return;
        }

        // Check if file with same name already exists in current folder
        const fileExists = files.some(f => f.originalname === file.name);
        if (fileExists) {
            setError(`A file with the name "${file.name}" already exists in this folder. Please rename the file or choose a different one.`);
            event.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        
        // Explicitly set the folder ID in the form data
        if (currentFolder) {
            formData.append('folder', currentFolder);
        }

        setUploading(true);
        setError('');
        
        try {
            const response = await axios.post('http://localhost:5000/api/files', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
                    console.log(`Upload Progress: ${percentCompleted}%`);
                },
            });

            // Verify the file was uploaded to the correct folder
            if (response.data.folder === currentFolder) {
                setFiles(prevFiles => [...prevFiles, response.data]);
            } else {
                // If the file wasn't uploaded to the expected folder, refresh the current folder contents
                await fetchFolderContents(currentFolder);
            }
            
            // Update storage info after successful upload
            await fetchStorageInfo();
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Error uploading file. Please try again.');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleFolderClick = async (folderId: string) => {
        try {
            const folder = folders.find(f => f._id === folderId);
            if (folder) {
                setCurrentFolder(folderId);
                setFolderPath(prev => [...prev, { id: folderId, name: folder.name }]);
                // Clear current files and folders before fetching new ones
                setFiles([]);
                setFolders([]);
                // Fetch the contents of the new folder
                await fetchFolderContents(folderId);
            }
        } catch (err: any) {
            console.error('Error navigating to folder:', err);
            setError(err.response?.data?.message || 'Error navigating to folder');
        }
    };

    const handleFolderCreate = async (name: string) => {
        try {
            const response = await axios.post(
                'http://localhost:5000/api/folders',
                {
                    name,
                    parent: currentFolder
                },
                config
            );
            setFolders(prev => [...prev, response.data]);
        } catch (err: any) {
            console.error('Error creating folder:', err);
            setError(err.response?.data?.message || 'Error creating folder');
        }
    };

    const handleFolderRename = async (folderId: string, newName: string) => {
        try {
            const response = await axios.put(
                `http://localhost:5000/api/folders/${folderId}`,
                { name: newName },
                config
            );
            setFolders(prev => prev.map(folder => 
                folder._id === folderId ? response.data : folder
            ));
        } catch (err: any) {
            console.error('Error renaming folder:', err);
            setError(err.response?.data?.message || 'Error renaming folder');
        }
    };

    const handleFolderDelete = async (folderId: string) => {
        try {
            await axios.delete(`http://localhost:5000/api/folders/${folderId}`, config);
            setFolders(prev => prev.filter(folder => folder._id !== folderId));
        } catch (err: any) {
            console.error('Error deleting folder:', err);
            setError(err.response?.data?.message || 'Error deleting folder');
        }
    };

    const navigateToFolder = async (folderId: string | null, index: number) => {
        setCurrentFolder(folderId);
        setFolderPath(prev => prev.slice(0, index + 1));
        // Clear current files and folders before fetching new ones
        setFiles([]);
        setFolders([]);
        // Fetch the contents of the selected folder
        await fetchFolderContents(folderId);
    };

    const handleDownload = async (fileId: string, filename: string) => {
        try {
            setError('');
            const response = await axios.get(`http://localhost:5000/api/files/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                responseType: 'blob'
            });

            // Create a blob URL and trigger download
            const blob = new Blob([response.data], { 
                type: response.headers['content-type'] 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Download error:', err);
            setError(err.response?.data?.message || 'Error downloading file');
        }
    };

    const handleDelete = async (fileId: string) => {
        try {
            setError('');
            // Find the file size before deleting
            const fileToDelete = files.find(f => f._id === fileId);
            if (!fileToDelete) return;

            await axios.delete(`http://localhost:5000/api/files/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Update the files list by removing the deleted file
            setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
            
            // Update storage info after successful deletion
            await fetchStorageInfo();
        } catch (err: any) {
            console.error('Delete error:', err);
            setError(err.response?.data?.message || 'Error deleting file');
        }
    };

    const formatSize = (bytes: number): string => {
        // Ensure bytes is a valid number
        if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
            return '0 Bytes';
        }
        
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        // Ensure we don't exceed array bounds
        const sizeIndex = Math.min(i, sizes.length - 1);
        return `${parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2))} ${sizes[sizeIndex]}`;
    };

    const calculateStoragePercentage = (used: number, total: number): number => {
        if (!used || !total || isNaN(used) || isNaN(total)) return 0;
        const percentage = (used / total) * 100;
        return Math.min(Math.max(percentage, 0), 100); // Clamp between 0 and 100
    };

    const storagePercentage = (storageUsed / storageLimit) * 100;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const theme = useTheme();

    const getFileIcon = (mimetype: string | undefined) => {
        if (!mimetype) return <InsertDriveFile />;
        if (mimetype.startsWith('image/')) return <Image />;
        if (mimetype.startsWith('video/')) return <VideoFile />;
        if (mimetype.startsWith('audio/')) return <AudioFile />;
        if (mimetype === 'application/pdf') return <PictureAsPdf />;
        if (mimetype === 'text/plain') return <Description />;
        if (mimetype.includes('javascript') || 
            mimetype.includes('typescript') || 
            mimetype.includes('json') || 
            mimetype.includes('html') || 
            mimetype.includes('css')) return <Code />;
        return <InsertDriveFile />;
    };

    const getFilePreview = (file: File) => {
        if (file.mimetype?.startsWith('image/')) {
            return (
                <Avatar
                    variant="rounded"
                    sx={{
                        width: 48,
                        height: 48,
                        bgcolor: 'transparent'
                    }}
                >
                    <img
                        src={`http://localhost:5000/api/files/${file._id}/preview`}
                        alt={file.originalname}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Hide the broken image
                            target.style.display = 'none';
                            // Show the fallback icon
                            if (target.parentElement) {
                                const iconElement = document.createElement('div');
                                iconElement.style.width = '24px';
                                iconElement.style.height = '24px';
                                iconElement.style.color = theme.palette.primary.main;
                                target.parentElement.appendChild(iconElement);
                                // Render the icon into the div
                                const FileIcon = getFileIcon(file.mimetype);
                                ReactDOM.render(FileIcon, iconElement);
                            }
                        }}
                    />
                </Avatar>
            );
        }

        return (
            <Avatar
                variant="rounded"
                sx={{
                    width: 48,
                    height: 48,
                    bgcolor: theme.palette.primary.light + '20'
                }}
            >
                {getFileIcon(file.mimetype)}
            </Avatar>
        );
    };

    return (
        <Container maxWidth="lg">
            {/* Header */}
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 3, 
                    mt: 4, 
                    background: theme.palette.primary.main,
                    color: 'white'
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Storage sx={{ fontSize: 40 }} />
                        <Typography variant="h4" component="h1">
                            My Storage
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<Logout />}
                        onClick={handleLogout}
                        sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.2)'
                            }
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            </Paper>

            <Box sx={{ mt: 3 }}>
                <Grid container spacing={3}>
                    {/* Breadcrumb Navigation */}
                    <Grid item xs={12}>
                        <Breadcrumbs aria-label="folder navigation">
                            {folderPath.map((folder, index) => (
                                <Link
                                    key={folder.id || 'root'}
                                    component="button"
                                    color={index === folderPath.length - 1 ? 'text.primary' : 'primary'}
                                    onClick={() => navigateToFolder(folder.id, index)}
                                    sx={{ textDecoration: 'none' }}
                                >
                                    {folder.name}
                                </Link>
                            ))}
                        </Breadcrumbs>
                    </Grid>

                    {/* Storage Usage Card */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ 
                            p: 3, 
                            height: '100%',
                            background: theme.palette.background.default,
                            border: `1px solid ${theme.palette.divider}`
                        }}>
                            <Typography variant="h6" gutterBottom sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                color: theme.palette.text.primary 
                            }}>
                                <Storage fontSize="small" />
                                Storage Usage
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {formatSize(storageUsed || 0)} of {formatSize(storageLimit || 104857600)} used
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={calculateStoragePercentage(storageUsed, storageLimit)}
                                    sx={{ 
                                        height: 8, 
                                        borderRadius: 4,
                                        bgcolor: theme.palette.grey[200],
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4
                                        }
                                    }}
                                />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Upload Section */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ 
                            p: 3,
                            background: theme.palette.background.default,
                            border: `1px solid ${theme.palette.divider}`
                        }}>
                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<CloudUpload />}
                                disabled={uploading}
                                fullWidth
                                sx={{ 
                                    py: 2,
                                    bgcolor: theme.palette.primary.main,
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.dark
                                    }
                                }}
                            >
                                {uploading ? 'Uploading...' : 'Upload File'}
                                <input
                                    type="file"
                                    hidden
                                    onChange={handleFileUpload}
                                />
                            </Button>
                            {uploading && <LinearProgress sx={{ mt: 2 }} />}
                        </Paper>
                    </Grid>

                    {/* Error Alert */}
                    {error && (
                        <Grid item xs={12}>
                            <Alert 
                                severity="error" 
                                sx={{ 
                                    width: '100%',
                                    '& .MuiAlert-message': { width: '100%' }
                                }}
                                onClose={() => setError('')}
                            >
                                {error}
                            </Alert>
                        </Grid>
                    )}

                    {/* Folders and Files List */}
                    <Grid item xs={12}>
                        <Paper sx={{ 
                            background: theme.palette.background.default,
                            border: `1px solid ${theme.palette.divider}`
                        }}>
                            <FolderList
                                folders={folders}
                                onFolderClick={handleFolderClick}
                                onFolderCreate={handleFolderCreate}
                                onFolderRename={handleFolderRename}
                                onFolderDelete={handleFolderDelete}
                            />
                            
                            {folders.length === 0 && files.length === 0 && (
                                <Box sx={{ 
                                    p: 4, 
                                    textAlign: 'center',
                                    color: theme.palette.text.secondary 
                                }}>
                                    <CloudUpload sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                    <Typography variant="body1">
                                        This folder is empty
                                    </Typography>
                                </Box>
                            )}

                            {/* Files */}
                            {files.length > 0 && (
                                <>
                                    {folders.length > 0 && <Divider />}
                                    <List>
                                        {files.map((file, index) => (
                                            <React.Fragment key={file._id}>
                                                <ListItem
                                                    sx={{
                                                        py: 2,
                                                        '&:hover': {
                                                            bgcolor: theme.palette.action.hover
                                                        }
                                                    }}
                                                    secondaryAction={
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Tooltip title="Download">
                                                                <IconButton
                                                                    onClick={() => handleDownload(file._id, file.originalname)}
                                                                    sx={{ 
                                                                        color: theme.palette.primary.main,
                                                                        '&:hover': {
                                                                            bgcolor: theme.palette.primary.light + '20'
                                                                        }
                                                                    }}
                                                                >
                                                                    <Download />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete">
                                                                <IconButton
                                                                    onClick={() => handleDelete(file._id)}
                                                                    sx={{ 
                                                                        color: theme.palette.error.main,
                                                                        '&:hover': {
                                                                            bgcolor: theme.palette.error.light + '20'
                                                                        }
                                                                    }}
                                                                >
                                                                    <Delete />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    }
                                                >
                                                    <ListItemAvatar>
                                                        {getFilePreview(file)}
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Typography variant="body1" component="div" sx={{ fontWeight: 500 }}>
                                                                {file.originalname}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Typography variant="body2" color="text.secondary">
                                                                {formatSize(file.size)} • Uploaded on{' '}
                                                                {new Date(file.createdAt).toLocaleDateString()}
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItem>
                                                {index < files.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
};

export default Dashboard; 