import React, { useState, useEffect } from 'react';
import { X, Check, Clock, FileText, Calendar, Camera, Upload, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { compressImage } from '../utils/imageCompression';

const TaskStatusModal = ({ isOpen, onClose, assignment, onSave, onDelete, isOwner, taskName, onlyWorkerAndOwner }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState(assignment?.status || 'pending');
    const [notes, setNotes] = useState(assignment?.notes || '');
    const [photos, setPhotos] = useState(assignment?.photos || []);
    const [startedAt, setStartedAt] = useState(assignment?.started_at || null);
    const [finishedAt, setFinishedAt] = useState(assignment?.finished_at || null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && assignment) {
            setStatus(assignment.status || 'pending');
            setNotes(assignment.notes || '');

            // Parse photos if they're stored as JSON string in database
            let parsedPhotos = assignment.photos || [];
            
            if (typeof parsedPhotos === 'string') {
                try {
                    parsedPhotos = JSON.parse(parsedPhotos);
                } catch (e) {
                    console.error('Error parsing photos:', e);
                    parsedPhotos = [];
                }
            } else if (Array.isArray(parsedPhotos)) {
                // Handle mixed content (strings vs objects) in case of migration issues
                parsedPhotos = parsedPhotos.map(p => {
                    if (typeof p === 'string') {
                        try {
                            // Try parsing if it looks like JSON
                            if (p.trim().startsWith('{') || p.trim().startsWith('[')) {
                                return JSON.parse(p);
                            }
                            // Otherwise assume it's just a URL string
                            return { url: p, id: crypto.randomUUID() };
                        } catch (e) {
                            return { url: p, id: crypto.randomUUID() };
                        }
                    }
                    return p;
                });
            }
            setPhotos(parsedPhotos);

            setStartedAt(assignment.started_at || null);
            setFinishedAt(assignment.finished_at || null);
        }
    }, [isOpen, assignment]);

    if (!isOpen) return null;

    const handleStatusChange = (newStatus) => {
        if (isOwner && !onlyWorkerAndOwner) return; // Owner in read-only mode unless specified otherwise, but usually owner can edit too? requirement says "owner also sees this popup but cannot edit anything". Wait, if owner cannot edit, then isOwner checks should prevent updates.
        // Actually, "The owner should also be able to view this information, though without editing capabilities."
        // So if isOwner is true, we disable editing.

        if (isOwner) return;

        setStatus(newStatus);
        const now = new Date().toISOString();

        if (newStatus === 'started' && !startedAt) {
            setStartedAt(now);
        } else if (newStatus === 'finished') {
            if (!startedAt) setStartedAt(now); // If jumping straight to finished
            setFinishedAt(now);
        } else if (newStatus === 'pending') {
            setStartedAt(null);
            setFinishedAt(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                status,
                notes,
                photos,
                started_at: startedAt,
                finished_at: finishedAt
            });
            onClose();
        } catch (error) {
            console.error('Failed to save status:', error);
            // Alert is simple but effective here since we don't have a toast component context readily available in this file scope
            alert(t('Failed to save changes. Please try again.'));
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString();
    };

    const handlePhotoUpload = async (e) => {
        if (isOwner) return;
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            const newPhotos = [...photos];

            for (const file of files) {
                // Compress image to base64 (matching ProjectDetailView pattern)
                const compressedBase64 = await compressImage(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.7
                });

                newPhotos.push({
                    id: crypto.randomUUID(),
                    url: compressedBase64,
                    name: file.name,
                    uploadedAt: new Date().toISOString()
                });
            }
            setPhotos(newPhotos);
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert(t('Error uploading photo'));
        } finally {
            setIsUploading(false);
        }
    };

    const removePhoto = (index) => {
        if (isOwner) return;
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        setPhotos(newPhotos);
    };

    const canEdit = !isOwner; // Owner is read-only

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">{taskName}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-6">

                    {/* Status Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('Status')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleStatusChange('pending')}
                                disabled={!canEdit}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${status === 'pending'
                                    ? 'bg-gray-100 border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                                    : 'border-transparent text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    } ${!canEdit ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                <Clock className="w-5 h-5" />
                                <span className="text-xs font-medium">{t('pending')}</span>
                            </button>

                            <button
                                onClick={() => handleStatusChange('started')}
                                disabled={!canEdit}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${status === 'started'
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                    : 'border-transparent text-gray-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                                    } ${!canEdit ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
                                <span className="text-xs font-medium">{t('started')}</span>
                            </button>

                            <button
                                onClick={() => handleStatusChange('finished')}
                                disabled={!canEdit}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${status === 'finished' // Fix typo in original thought process if any
                                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                                    : 'border-transparent text-gray-400 hover:bg-green-50/50 dark:hover:bg-green-900/20'
                                    } ${!canEdit ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                <Check className="w-5 h-5" />
                                <span className="text-xs font-medium">{t('finished')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Timestamps */}
                    {(startedAt || finishedAt) && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2 text-sm">
                            {startedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{t('Started')}:</span>
                                    <span className="font-mono text-gray-900 dark:text-white">{formatDate(startedAt)}</span>
                                </div>
                            )}
                            {finishedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{t('Finished')}:</span>
                                    <span className="font-mono text-gray-900 dark:text-white">{formatDate(finishedAt)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            {t('Notes')}
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={!canEdit}
                            placeholder={canEdit ? t('Add a note...') : t('No notes')}
                            className="w-full min-h-[100px] p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none resize-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400 text-sm disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Photos */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Camera className="w-3 h-3" />
                            {t('Photos')}
                        </label>

                        <div className="grid grid-cols-3 gap-2">
                            {photos.map((photo, index) => {
                                // Handle both object format {url: '...'} and direct string format
                                const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                return (
                                    <div key={photo?.id || index} className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100 dark:bg-gray-800">
                                        <img src={photoUrl} alt="Task" className="w-full h-full object-cover" />
                                        {canEdit && (
                                            <button
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {canEdit && (
                                <label className={`aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                        disabled={isUploading}
                                    />
                                    {isUploading ? (
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5 text-gray-400" />
                                            <span className="text-[10px] uppercase font-bold text-gray-400">{t('Upload')}</span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        {isOwner && onDelete && (
                            <button
                                onClick={() => {
                                    if (window.confirm(t('Are you sure you want to delete this assignment?'))) {
                                        onDelete();
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('Delete')}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {isOwner ? t('Close') : t('Cancel')}
                        </button>

                        {canEdit && (
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                            >
                                {t('Save Changes')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskStatusModal;
