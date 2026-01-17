import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const TutorialModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!isOpen) return null;

    const steps = [
        // Landing
        {
            title: t('Fido Building Calcul'),
            description: t('This app will save you hours spent in creating budgets. With the FIDO building calcul app, the budget will be ready in just a few minutes. The app calculates the cost of labor and materials needed for the reconstruction of a house, apartment, etc.'),
            images: [],
            isLanding: true
        },
        // Main Price List
        {
            title: t('Main price list'),
            description: t('Customize according to your work and material costs. Price changes will reflect in every newly created project.'),
            images: ['/tutorial/mainPriceList.jpg']
        },
        // Project Price List
        {
            title: t('Project price list'),
            description: t('For changing prices in individual projects, use the project price list. Price changes will only affect the current project.'),
            images: ['/tutorial/projectPriceList.jpg']
        },
        // Rooms
        {
            title: t('Rooms'),
            description: t('By clicking on:( + ) select the room you want to renovate. If you click on: (Custom) you can create your own room name.\n\nAfter adding the work you want to perform, the app will calculate the cost of labor and materials as well as the quantity (m, m2, pcs…) of materials needed for the renovation.'),
            images: ['/tutorial/rooms.jpg']
        },
        // Clients
        {
            title: t('Clients'),
            description: t('Add a new client by clicking on: (+)\nChoose a private or legal entity and fill in the client\'s details.\nDon\'t forget to save the details.'),
            images: ['/tutorial/clientsHeadline.jpg', '/tutorial/bottomBarClients.jpg']
        },
        // New Project
        {
            title: t('New project'),
            description: t('After saving the client\'s details, you can see already created projects, as well as create a new one by clicking on: (+)'),
            images: ['/tutorial/createNewProject.jpg']
        },
        // Settings
        {
            title: t('Settings'),
            description: t('Projects in the archive can be restored or permanently deleted.'),
            images: ['/tutorial/archiveSettings.jpg', '/tutorial/bottomBarSettings.jpg']
        },
        // Work Price List (Auxiliary)
        {
            title: t('Work price list'),
            description: t('The last item is - Auxiliary and finishing works.\nThis item includes: material purchase, handling, carrying out, cleaning, covering, taping, waste removal...\n\nFrom our experience, we have found that it is appropriate to set this item at 10%.\n\nExample:\nWork cost will be               1000€\nAuxiliary and finishing works   10%\nTotal work cost                 1100€'),
            images: []
        },
        // Material Price List (Auxiliary)
        {
            title: t('Material price list'),
            description: t('The last item is - Auxiliary and connecting material.\nThis item includes: cover films, tapes, rollers, brushes, knives, pencils...\n\nFrom our experience, we have found that it is appropriate to set this item at 10%.\n\nExample:\nMaterial cost will be               1000€\nAuxiliary and connecting material   10%\nTotal material cost                 1100€'),
            images: []
        }
    ];

    const handleNext = () => {
        if (currentIndex < steps.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
            setCurrentIndex(0);
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const currentStep = steps[currentIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header - only close button */}
                <div className="p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col items-center text-center">

                    {currentStep.isLanding && (
                        <div className="mb-6 w-full max-w-[200px]">
                            <img src="/appIcon.jpg" alt="Logo" className="w-full h-auto rounded-3xl" />
                        </div>
                    )}

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {currentStep.title}
                    </h2>

                    <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300 mb-6 text-sm whitespace-pre-line">
                        {currentStep.description}
                    </div>

                    {currentStep.images && currentStep.images.length > 0 && (
                        <div className="flex flex-col gap-4 w-full items-center">
                            {currentStep.images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    alt={`Step ${currentIndex + 1} visual ${index + 1}`}
                                    className="rounded-xl shadow-md max-h-[200px] w-auto object-contain"
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-4">
                        {/* Indicators */}
                        <div className="flex gap-1.5 mx-auto">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex
                                        ? 'bg-gray-900 dark:bg-white w-4'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {currentIndex > 0 && (
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                {t('Back')}
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:opacity-90 transition-opacity shadow-lg"
                        >
                            {currentIndex === steps.length - 1 ? t('Finish') : t('Next')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TutorialModal;
