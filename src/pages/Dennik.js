import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Plus,
    UserPlus,
    ClipboardList,
    ChevronRight,
    Loader2,
    UserMinus,
    X,
    Crown,
    CheckCircle2,
    Clock,
    Camera,
    FileText,
    Image as ImageIcon
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/supabaseApi';

const Dennik = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const {
        myTeams,
        myJobs,
        myInvitations,
        createTeam,
        loadTeamData,
        updateJobAssignment,
        respondToInvitation
    } = useAppData();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoadingTeamDetail, setIsLoadingTeamDetail] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [sharedProjects, setSharedProjects] = useState([]);
    const [isUpdatingTask, setIsUpdatingTask] = useState(null); // ID of task being updated
    const [taskNotes, setTaskNotes] = useState('');

    // Load team data on mount
    useEffect(() => {
        loadTeamData();
    }, [loadTeamData]);

    // Debounced search effect for adding members
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                handleSearch(searchQuery);
            } else if (searchQuery.trim().length === 0) {
                setSearchResults([]);
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = async (query) => {
        if (!query || query.trim().length < 2) return;

        setIsSearching(true);
        try {
            const results = await api.userProfiles.search(query);
            // Mark users based on their current relationship to the selected team
            const markedResults = results.map(u => {
                const existingMember = teamMembers.find(m => m.user_id === u.id);
                return {
                    ...u,
                    isSelf: u.id === user?.id,
                    isMember: existingMember?.status === 'active',
                    isInvited: existingMember?.status === 'invited'
                };
            });
            setSearchResults(markedResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        setIsCreating(true);
        try {
            await createTeam(newTeamName);
            setNewTeamName('');
            setShowCreateModal(false);
        } catch (error) {
            console.error('Create team error:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSelectTeam = async (team) => {
        setSelectedTeam(team);
        setIsLoadingTeamDetail(true);
        try {
            const [members, projects] = await Promise.all([
                api.teams.getMembers(team.id),
                api.teams.getSharedProjects(team.id)
            ]);
            setTeamMembers(members || []);
            setSharedProjects(projects || []);
        } catch (error) {
            console.error('Error loading team details:', error);
        } finally {
            setIsLoadingTeamDetail(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId, currentStatus) => {
        const nextStatus = currentStatus === 'pending' ? 'finished' : 'pending';
        try {
            await updateJobAssignment(taskId, { status: nextStatus });
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleSaveTaskDetails = async (taskId) => {
        try {
            await updateJobAssignment(taskId, { notes: taskNotes });
            setIsUpdatingTask(null);
            setTaskNotes('');
        } catch (error) {
            console.error('Error saving task details:', error);
        }
    };

    const handleInvitationResponse = async (teamId, accept) => {
        try {
            await respondToInvitation(teamId, accept);
        } catch (error) {
            console.error('Error responding to invitation:', error);
            alert(t('Failed to respond to invitation. Please try again.'));
        }
    };

    const handleAddMember = async (userId) => {
        if (!selectedTeam) return;
        try {
            await api.teams.join(selectedTeam.id, userId);
            const members = await api.teams.getMembers(selectedTeam.id);
            setTeamMembers(members || []);
            setShowAddMemberModal(false);
        } catch (error) {
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('Conflict')) {
                // User is already a member - just refresh the list gracefully
                try {
                    const members = await api.teams.getMembers(selectedTeam.id);
                    setTeamMembers(members || []);
                } catch (e) { console.error('Error refreshing members:', e); }
                setShowAddMemberModal(false);
            } else {
                console.error('Error adding member:', error);
                alert(t('Failed to add member'));
            }
        }
    };

    // Prepare unified sorted team list
    const sortedTeams = [...myTeams].sort((a, b) => {
        const aIsOwner = a.owner_id === user?.id;
        const bIsOwner = b.owner_id === user?.id;
        if (aIsOwner && !bIsOwner) return -1;
        if (!aIsOwner && bIsOwner) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="pb-20 lg:pb-0 overflow-hidden w-full min-w-0">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('Denník')}</h1>
                {!selectedTeam && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{t('Create Team')}</span>
                    </button>
                )}
            </div>

            <div className="space-y-6 animate-fade-in">
                {selectedTeam ? (
                    <div className="animate-fade-in space-y-6">
                        <button
                            onClick={() => setSelectedTeam(null)}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                            <span>{t('Back to Teams')}</span>
                        </button>

                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h2>
                                    <p className="text-gray-500">{selectedTeam.owner_id === user?.id ? t('You are the owner') : t('Team Member')}</p>
                                </div>
                                {selectedTeam.owner_id === user?.id && (
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                        <span>{t('Add Member')}</span>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Members Section */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        {t('Members')}
                                    </h3>
                                    <div className="space-y-2">
                                        {isLoadingTeamDetail ? (
                                            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" /></div>
                                        ) : (
                                            teamMembers.map(member => (
                                                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                            {member.profiles?.full_name?.charAt(0).toUpperCase() || member.profiles?.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                                {member.profiles?.full_name || member.profiles?.email}
                                                                {selectedTeam.owner_id === member.user_id && (
                                                                    <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                                )}
                                                                {member.status === 'invited' && (
                                                                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        {t('Pending')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500 capitalize">{t(member.role)}</div>
                                                        </div>
                                                    </div>
                                                    {selectedTeam.owner_id === user?.id && member.user_id !== user?.id && (
                                                        <button className="text-gray-400 hover:text-red-500 transition-colors">
                                                            <UserMinus className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Shared Projects */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5" />
                                        {t('Shared Projects')}
                                    </h3>
                                    <div className="space-y-2">
                                        {sharedProjects.length > 0 ? (
                                            sharedProjects.map(sp => (
                                                <div key={sp.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
                                                            <ClipboardList className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 dark:text-white">{sp.projects?.name}</div>
                                                            <div className="text-xs text-gray-500">{sp.projects?.location || t('No location')}</div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                                <p>{t('No projects shared with this team yet.')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Unified Team List */
                    <div className="space-y-8">
                        {/* Invitations Section */}
                        {myInvitations?.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <UserPlus className="w-6 h-6 text-amber-500" />
                                    {t('Invitations')}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myInvitations.map(inv => (
                                        <div key={inv.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center text-amber-600">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white">{t('Join team')}: {inv.teams?.name}</div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Invitation to collaborate')}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleInvitationResponse(inv.team_id, true)}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                                                >
                                                    {t('Accept')}
                                                </button>
                                                <button
                                                    onClick={() => handleInvitationResponse(inv.team_id, false)}
                                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    {t('Decline')}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Tasks Section */}
                        {myJobs?.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    {t('My Tasks')}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myJobs.map(job => (
                                        <div
                                            key={job.id}
                                            className={`p-5 rounded-3xl border transition-all ${job.status === 'finished'
                                                ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'
                                                : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 shadow-sm'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleUpdateTaskStatus(job.id, job.status)}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${job.status === 'finished'
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-500 dark:bg-gray-700'
                                                            }`}
                                                    >
                                                        {job.status === 'finished' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                                    </button>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{job.job_name}</h4>
                                                        <p className="text-xs text-gray-500">{job.projects?.name} • {job.rooms?.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setIsUpdatingTask(job.id);
                                                            setTaskNotes(job.notes || '');
                                                        }}
                                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-blue-500"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {isUpdatingTask === job.id ? (
                                                <div className="space-y-3 animate-slide-in">
                                                    <textarea
                                                        value={taskNotes}
                                                        onChange={(e) => setTaskNotes(e.target.value)}
                                                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white min-h-[80px]"
                                                        placeholder={t('Add notes about your task...')}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-500 hover:text-blue-500 transition-colors"
                                                            title={t('Add Photo')}
                                                        >
                                                            <Camera className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveTaskDetails(job.id)}
                                                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                                                        >
                                                            {t('Save')}
                                                        </button>
                                                        <button
                                                            onClick={() => setIsUpdatingTask(null)}
                                                            className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium"
                                                        >
                                                            {t('Cancel')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {job.notes && (
                                                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{job.notes}"</p>
                                                        </div>
                                                    )}
                                                    {job.photos?.length > 0 && (
                                                        <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
                                                            {job.photos.map((photo, idx) => (
                                                                <div key={idx} className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                                                    <img src={photo} alt="Task" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-500" />
                                {t('My Teams')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {sortedTeams.length > 0 ? (
                                    sortedTeams.map(team => {
                                        const isOwner = team.owner_id === user?.id;
                                        return (
                                            <div
                                                key={team.id}
                                                onClick={() => handleSelectTeam(team)}
                                                className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden
                                            ${isOwner
                                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                                    }`}
                                            >
                                                {isOwner && (
                                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                                                        {t('OWNER')}
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-2xl ${isOwner ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                                        <Users className={`w-6 h-6 ${isOwner ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 pr-6">{team.name}</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                                    {isOwner ? t('You manage this team') : t('Member')}
                                                </p>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-12 text-center text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p className="text-lg font-medium">{t('No teams yet')}</p>
                                        <p className="text-sm">{t('Create your first team to get started.')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-scale-in">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('Create New Team')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Team name')}</label>
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    placeholder={t('Enter team name')}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={handleCreateTeam}
                                    disabled={isCreating || !newTeamName.trim()}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('Create')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Add Team Member')}</h2>
                            <button onClick={() => setShowAddMemberModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="relative mb-6">
                            <input
                                type="text"
                                placeholder={t('Search by name or email...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                autoFocus
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>

                        <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-2">
                            {isSearching ? (
                                <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(userResult => (
                                    <button
                                        key={userResult.id}
                                        onClick={() => handleAddMember(userResult.id)}
                                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                                                {userResult.full_name?.charAt(0).toUpperCase() || userResult.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {userResult.full_name || userResult.email.split('@')[0]}
                                                    {userResult.isMember && (
                                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                                            {t('Member')}
                                                        </span>
                                                    )}
                                                    {userResult.isInvited && (
                                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                                            {t('Pending')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">{userResult.email}</div>
                                            </div>
                                        </div>
                                        {!(userResult.isMember || userResult.isInvited) && (
                                            <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                                        )}
                                    </button>
                                ))
                            ) : searchQuery && (
                                <div className="py-8 text-center text-gray-500">
                                    <p>{t('No users found.')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dennik;
