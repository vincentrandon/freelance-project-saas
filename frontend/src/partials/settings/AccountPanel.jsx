import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../utils/AuthContext';
import { useProfile, useUpdateProfile } from '../../api/hooks';
import { useToast } from '../../components/ToastNotification';
import Image from '../../images/user-avatar-80.png';

function AccountPanel() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const toast = useToast();
  const [sync, setSync] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (profile?.preferred_language) {
      setSelectedLanguage(profile.preferred_language);
      i18n.changeLanguage(profile.preferred_language);
    }
  }, [profile, i18n]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);

    // Update backend
    updateProfileMutation.mutate({
      preferred_language: newLanguage
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update profile including user first_name, last_name, and language preference
      await updateProfileMutation.mutateAsync({
        user_first_name: formData.first_name,
        user_last_name: formData.last_name,
        preferred_language: selectedLanguage
      });

      // Ensure language stays set after save
      i18n.changeLanguage(selectedLanguage);

      // Show success toast
      toast.success(t('messages.saveSuccess'));
    } catch (error) {
      console.error('Error saving account settings:', error);
      toast.error(t('messages.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">{t('settings.accountPanel.myAccount')}</h2>

        {/* Picture */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">{t('settings.accountPanel.profilePicture')}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            {t('settings.accountPanel.profilePictureDesc')}
          </div>
          <div className="flex items-center">
            <div className="mr-4">
              <img className="w-20 h-20 rounded-full" src={Image} width="80" height="80" alt="User upload" />
            </div>
            <button className="btn-sm dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">{t('settings.accountPanel.change')}</button>
          </div>
        </section>

        {/* Personal Information */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">{t('settings.accountPanel.personalInformation')}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            {t('settings.accountPanel.personalInformationDesc')}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="first_name">{t('settings.accountPanel.firstName')}</label>
                <input
                  id="first_name"
                  name="first_name"
                  className="form-input w-full"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="last_name">{t('settings.accountPanel.lastName')}</label>
                <input
                  id="last_name"
                  name="last_name"
                  className="form-input w-full"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Email */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">{t('settings.accountPanel.emailAddress')}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            {t('settings.accountPanel.emailAddressDesc')}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <label className="sr-only" htmlFor="email">{t('settings.accountPanel.emailAddress')}</label>
              <input
                id="email"
                name="email"
                className="form-input w-full"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled
              />
            </div>
            <button className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">{t('settings.accountPanel.changeEmail')}</button>
          </div>
        </section>

        {/* Password */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">{t('settings.accountPanel.password')}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            {t('settings.accountPanel.passwordDesc')}
          </div>
          <div>
            <button className="btn border-gray-200 dark:border-gray-700/60 shadow-xs text-violet-500">{t('settings.accountPanel.changePassword')}</button>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">{t('settings.accountPanel.preferences')}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            {t('settings.accountPanel.preferencesDesc')}
          </div>
          <div className="space-y-3">
            {/* Language Preference */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.languagePreference')}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.chooseLanguage')}</div>
              </div>
              <div className="flex items-center">
                <select
                  id="language"
                  className="form-select w-40"
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.accountPanel.emailNotifications')}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.accountPanel.emailNotificationsDesc')}</div>
              </div>
              <div className="flex items-center">
                <div className="form-switch">
                  <input type="checkbox" id="email-notifications" className="sr-only" defaultChecked />
                  <label htmlFor="email-notifications">
                    <span className="bg-white shadow-xs" aria-hidden="true"></span>
                    <span className="sr-only">{t('settings.accountPanel.enableEmailNotifications')}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.accountPanel.autoSync')}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.accountPanel.autoSyncDesc')}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="form-switch">
                  <input type="checkbox" id="toggle" className="sr-only" checked={sync} onChange={() => setSync(!sync)} />
                  <label htmlFor="toggle">
                    <span className="bg-white shadow-xs" aria-hidden="true"></span>
                    <span className="sr-only">{t('settings.accountPanel.enableSmartSync')}</span>
                  </label>
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500 italic">{sync ? t('settings.accountPanel.on') : t('settings.accountPanel.off')}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Panel footer */}
      <footer>
        <div className="flex flex-col px-6 py-5 border-t border-gray-200 dark:border-gray-700/60">
          <div className="flex self-end">
            <button
              className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
              onClick={() => window.location.reload()}
            >
              {t('common.cancel')}
            </button>
            <button
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? t('common.saving') : t('common.saveChanges')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AccountPanel;
