import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    const userEmail = sessionStorage.getItem('userEmail');
    const userRole = sessionStorage.getItem('userRole');
    const userVerified = sessionStorage.getItem('userVerified');
    const userImageUrl = sessionStorage.getItem('userImageUrl');
    const token = sessionStorage.getItem('token');

    if (userId && userName && userEmail && userRole && token) {
      setUser({
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole,
        verified: userVerified === 'true',
        imageUrl: userImageUrl,
        token: token
      });
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    const userInfo = {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
      verified: userData.verified,
      imageUrl: userData.imageUrl,
      token: token
    };
    
    setUser(userInfo);
    
    // Store in sessionStorage
    sessionStorage.setItem('userId', userData.id);
    sessionStorage.setItem('userName', userData.fullName);
    sessionStorage.setItem('userEmail', userData.email);
    sessionStorage.setItem('userRole', userData.role);
    sessionStorage.setItem('userVerified', userData.verified);
    sessionStorage.setItem('userImageUrl', userData.imageUrl);
    sessionStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    sessionStorage.clear();
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
