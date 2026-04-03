import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const toast            = useToast();
  const navigate         = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.info('You have been signed out.');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/dashboard" style={{ textDecoration: 'none' }}>
        <span className="navbar-brand">BID<span>STREAM</span></span>
      </Link>

      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-user">
              {user.displayName || user.username}
            </span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Sign Out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-ghost">Sign In</Link>
        )}
      </div>
    </nav>
  );
}
