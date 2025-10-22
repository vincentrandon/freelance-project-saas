import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import Image from '../../images/user-avatar-80.png';

function AccountPanel() {
  const { user } = useAuth();
  const [sync, setSync] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving account settings:', formData);
  };

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">My Account</h2>

        {/* Picture */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Profile Picture</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Update your personal profile picture
          </div>
          <div className="flex items-center">
            <div className="mr-4">
              <img className="w-20 h-20 rounded-full" src={Image} width="80" height="80" alt="User upload" />
            </div>
            <button className="btn-sm dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">Change</button>
          </div>
        </section>

        {/* Personal Information */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Personal Information</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Your personal details for account management
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="first_name">First Name</label>
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
                <label className="block text-sm font-medium mb-1" htmlFor="last_name">Last Name</label>
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
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Email Address</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Your email address for account authentication and notifications
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <label className="sr-only" htmlFor="email">Email address</label>
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
            <button className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">Change Email</button>
          </div>
        </section>

        {/* Password */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Password</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Update your password to keep your account secure
          </div>
          <div>
            <button className="btn border-gray-200 dark:border-gray-700/60 shadow-xs text-violet-500">Change Password</button>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Preferences</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Manage your account preferences and settings
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Email Notifications</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Receive email updates about your account</div>
              </div>
              <div className="flex items-center">
                <div className="form-switch">
                  <input type="checkbox" id="email-notifications" className="sr-only" defaultChecked />
                  <label htmlFor="email-notifications">
                    <span className="bg-white shadow-xs" aria-hidden="true"></span>
                    <span className="sr-only">Enable email notifications</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Auto Sync</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Automatically sync your data across devices</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="form-switch">
                  <input type="checkbox" id="toggle" className="sr-only" checked={sync} onChange={() => setSync(!sync)} />
                  <label htmlFor="toggle">
                    <span className="bg-white shadow-xs" aria-hidden="true"></span>
                    <span className="sr-only">Enable smart sync</span>
                  </label>
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500 italic">{sync ? 'On' : 'Off'}</div>
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
              Cancel
            </button>
            <button
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AccountPanel;
