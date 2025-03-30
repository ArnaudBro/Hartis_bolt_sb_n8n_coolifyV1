import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, BookTemplate, Settings, LogOut, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Navigation = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex space-x-8">
            <NavLink
              to="/new-report"
              className={({ isActive }) =>
                `flex items-center space-x-2 text-gray-700 hover:text-blue-600 ${
                  isActive ? 'text-blue-600' : ''
                }`
              }
            >
              <FileText size={20} />
              <span>New Report</span>
            </NavLink>
            
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `flex items-center space-x-2 text-gray-700 hover:text-blue-600 ${
                  isActive ? 'text-blue-600' : ''
                }`
              }
            >
              <ClipboardList size={20} />
              <span>Reports</span>
            </NavLink>
            
            <NavLink
              to="/templates"
              className={({ isActive }) =>
                `flex items-center space-x-2 text-gray-700 hover:text-blue-600 ${
                  isActive ? 'text-blue-600' : ''
                }`
              }
            >
              <BookTemplate size={20} />
              <span>Templates</span>
            </NavLink>
            
            <NavLink
              to="/rules"
              className={({ isActive }) =>
                `flex items-center space-x-2 text-gray-700 hover:text-blue-600 ${
                  isActive ? 'text-blue-600' : ''
                }`
              }
            >
              <Settings size={20} />
              <span>Custom Rules</span>
            </NavLink>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-700 hover:text-red-600"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;