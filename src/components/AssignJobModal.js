import React, { useState, useEffect } from 'react';
import {
    X,
    UserPlus,
    Search,
    Loader2,
    Users
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';

const AssignJobModal = ({ isOpen, onClose, projectId, roomId, jobId, jobName }) => {
    const { t } = useLanguage();
    const { assignUserToJob } = useAppData();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [assigningId, setAssigningId] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);

    // In a real app, we'd fetch members of all teams this project is shared with.
    // For now, we'll show members of "myTeams" as a simplified version,
    // or ideally we'd have a specific API to get eligible assignees for a project.
    useEffect(() => {
        const fetchMembers = async () => {
            if (!isOpen || !projectId) return;
            setLoading(true);
            try {
                const members = await api.teams.getEligibleAssignees(projectId);
                const uniqueMembers = [];
                const seenIds = new Set();

                members.forEach(m => {
                    if (!seenIds.has(m.user_id)) {
                        seenIds.add(m.user_id);
                        uniqueMembers.push({
                            id: m.user_id,
                            teamId: m.team_id,
                            name: m.profiles?.full_name || m.profiles?.email || t('Unknown User'),
                            email: m.profiles?.email,
                            teamName: m.teams?.name
                        });
                    }
                });
                setTeamMembers(uniqueMembers);
            } catch (error) {
                console.error('Error fetching assignees:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, [isOpen, projectId, t]);

    const handleAssign = async (userId, teamId) => {
        setAssigningId(userId);
        try {
            await assignUserToJob({
                project_id: projectId,
                room_id: roomId,
                work_item_id: jobId,
                user_id: userId,
                team_id: teamId
            });
            onClose();
        } catch (error) {
            console.error('Failed to assign job:', error);
            alert(t('Failed to assign user.'));
        } finally {
            setAssigningId(null);
        }
    };

    if (!isOpen) return null;

    const filteredMembers = teamMembers.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Assign User')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Assigning to')}: <span className="font-semibold">{jobName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="relative mb-6">
                        <input
                            type="text"
                            placeholder={t('Search team members...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-2">
                        {loading ? (
                            <div className="py-12 text-center text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                                <p>{t('Loading members...')}</p>
                            </div>
                        ) : filteredMembers.length > 0 ? (
                            filteredMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleAssign(member.id, member.teamId)}
                                    disabled={assigningId === member.id}
                                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                {member.name}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {member.teamName}
                                            </div>
                                        </div>
                                    </div>
                                    {assigningId === member.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    ) : (
                                        <UserPlus className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <Search className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                <p>{t('No members found.')}</p>
                                <p className="text-sm mt-1">{t('Try sharing this project with a team first.')}</p>
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

export default AssignJobModal;
