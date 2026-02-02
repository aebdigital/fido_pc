import React, { useState } from 'react';
import {
    X,
    Share2,
    Search,
    Loader2,
    Users
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';

const ShareProjectModal = ({ isOpen, onClose, projectId, projectName }) => {
    const { t } = useLanguage();
    const { myTeams, shareProjectToTeam } = useAppData();
    const [searchTerm, setSearchTerm] = useState('');
    const [sharingId, setSharingId] = useState(null);

    const handleShare = async (teamId) => {
        setSharingId(teamId);
        try {
            await shareProjectToTeam(teamId, projectId);
            onClose();
        } catch (error) {
            console.error('Failed to share project:', error);
            alert(t('Failed to share project.'));
        } finally {
            setSharingId(null);
        }
    };

    if (!isOpen) return null;

    const filteredTeams = myTeams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Share Project')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Sharing')}: <span className="font-semibold">{projectName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="relative mb-6">
                        <input
                            type="text"
                            placeholder={t('Search teams...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-2">
                        {filteredTeams.length > 0 ? (
                            filteredTeams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => handleShare(team.id)}
                                    disabled={sharingId === team.id}
                                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                {team.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {team.team_members?.length || 0} {t('members')}
                                            </div>
                                        </div>
                                    </div>
                                    {sharingId === team.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    ) : (
                                        <Share2 className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                <p>{t('No teams found.')}</p>
                                <p className="text-sm mt-1">{t('Create a team in Denník first.')}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareProjectModal;
