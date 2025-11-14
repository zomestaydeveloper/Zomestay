import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Copy, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { findRoleFromPathname } from '../utils/findrole';

const ReduxDebug = () => {
  const location = useLocation();
  const [copied, setCopied] = useState({});
  const [expanded, setExpanded] = useState({
    userAuth: true,
    agentAuth: true,
    adminAuth: true,
    hostAuth: true,
    property: true,
  });

  // Get all Redux state
  const reduxState = useSelector((state) => state);

  // Get current role from route
  const currentRole = findRoleFromPathname(location.pathname);

  // Get persisted state from localStorage
  const getPersistedState = () => {
    try {
      const persistedState = localStorage.getItem('persist:root');
      if (!persistedState) return null;
      return JSON.parse(persistedState);
    } catch (error) {
      console.error('Error parsing persisted state:', error);
      return null;
    }
  };

  const persistedState = getPersistedState();

  // Format and parse persisted state values
  const getParsedPersistedState = () => {
    if (!persistedState) return null;
    const parsed = {};
    Object.keys(persistedState).forEach((key) => {
      try {
        parsed[key] = JSON.parse(persistedState[key]);
      } catch (error) {
        parsed[key] = persistedState[key];
      }
    });
    return parsed;
  };

  const parsedPersistedState = getParsedPersistedState();

  // Copy to clipboard
  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied({ ...copied, [key]: true });
      setTimeout(() => {
        setCopied({ ...copied, [key]: false });
      }, 2000);
    });
  };

  // Toggle expanded state
  const toggleExpanded = (key) => {
    setExpanded({ ...expanded, [key]: !expanded[key] });
  };

  // Format JSON for display
  const formatJSON = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  // Get token preview (first 20 chars)
  const getTokenPreview = (token) => {
    if (!token) return 'null';
    return `${token.substring(0, 20)}... (${token.length} chars)`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Redux Store Debug Page</h1>
              <p className="text-sm text-gray-600 mt-1">View all Redux store state for debugging</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-300">
                Current Route: {location.pathname}
              </div>
              <div className="px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-300">
                Detected Role: {currentRole || 'none'}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">User Token</p>
              <p className="text-sm font-medium text-gray-900">
                {reduxState.userAuth?.userAccessToken ? '✅ Present' : '❌ Missing'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Agent Token</p>
              <p className="text-sm font-medium text-gray-900">
                {reduxState.agentAuth?.agentAccessToken ? '✅ Present' : '❌ Missing'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Admin Token</p>
              <p className="text-sm font-medium text-gray-900">
                {reduxState.adminAuth?.adminAccessToken ? '✅ Present' : '❌ Missing'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Host Token</p>
              <p className="text-sm font-medium text-gray-900">
                {reduxState.hostAuth?.hostAccessToken ? '✅ Present' : '❌ Missing'}
              </p>
            </div>
          </div>
        </div>

        {/* Redux State Sections */}
        <div className="space-y-4">
          {/* User Auth Slice */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleExpanded('userAuth')}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">userAuth Slice</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {reduxState.userAuth?.userAccessToken ? 'Logged In' : 'Not Logged In'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(formatJSON(reduxState.userAuth), 'userAuth');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied.userAuth ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                {expanded.userAuth ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
            {expanded.userAuth && (
              <div className="p-4">
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {formatJSON(reduxState.userAuth)}
                  </pre>
                </div>
                {reduxState.userAuth?.userAccessToken && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs font-medium text-yellow-800 mb-1">Token Preview:</p>
                    <p className="text-xs text-yellow-700 font-mono">{getTokenPreview(reduxState.userAuth.userAccessToken)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Agent Auth Slice */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleExpanded('agentAuth')}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">agentAuth Slice</h2>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                  {reduxState.agentAuth?.agentAccessToken ? 'Logged In' : 'Not Logged In'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(formatJSON(reduxState.agentAuth), 'agentAuth');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied.agentAuth ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                {expanded.agentAuth ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
            {expanded.agentAuth && (
              <div className="p-4">
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {formatJSON(reduxState.agentAuth)}
                  </pre>
                </div>
                {reduxState.agentAuth?.agentAccessToken && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs font-medium text-yellow-800 mb-1">Token Preview:</p>
                    <p className="text-xs text-yellow-700 font-mono">{getTokenPreview(reduxState.agentAuth.agentAccessToken)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin Auth Slice */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleExpanded('adminAuth')}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">adminAuth Slice</h2>
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                  {reduxState.adminAuth?.adminAccessToken ? 'Logged In' : 'Not Logged In'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(formatJSON(reduxState.adminAuth), 'adminAuth');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied.adminAuth ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                {expanded.adminAuth ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
            {expanded.adminAuth && (
              <div className="p-4">
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {formatJSON(reduxState.adminAuth)}
                  </pre>
                </div>
                {reduxState.adminAuth?.adminAccessToken && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs font-medium text-yellow-800 mb-1">Token Preview:</p>
                    <p className="text-xs text-yellow-700 font-mono">{getTokenPreview(reduxState.adminAuth.adminAccessToken)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Host Auth Slice */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleExpanded('hostAuth')}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">hostAuth Slice</h2>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  {reduxState.hostAuth?.hostAccessToken ? 'Logged In' : 'Not Logged In'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(formatJSON(reduxState.hostAuth), 'hostAuth');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied.hostAuth ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                {expanded.hostAuth ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
            {expanded.hostAuth && (
              <div className="p-4">
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {formatJSON(reduxState.hostAuth)}
                  </pre>
                </div>
                {reduxState.hostAuth?.hostAccessToken && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs font-medium text-yellow-800 mb-1">Token Preview:</p>
                    <p className="text-xs text-yellow-700 font-mono">{getTokenPreview(reduxState.hostAuth.hostAccessToken)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Property Slice */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleExpanded('property')}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">property Slice</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(formatJSON(reduxState.property), 'property');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied.property ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                {expanded.property ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
            {expanded.property && (
              <div className="p-4">
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {formatJSON(reduxState.property)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Persisted State (localStorage) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Persisted State (localStorage)</h2>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
                  {persistedState ? 'Present' : 'Not Found'}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(formatJSON(parsedPersistedState || {}), 'persisted')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copied.persisted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="p-4">
              {parsedPersistedState ? (
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {formatJSON(parsedPersistedState)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No persisted state found in localStorage</p>
              )}
            </div>
          </div>

          {/* Complete Redux State (All Slices Combined) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Complete Redux State</h2>
                <span className="px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded">
                  All Slices
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(formatJSON(reduxState), 'complete')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copied.complete ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="p-4">
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {formatJSON(reduxState)}
                </pre>
              </div>
            </div>
          </div>

          {/* Current Route Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Route Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Current Pathname:</span>
                <span className="text-gray-900 font-mono">{location.pathname}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Detected Role:</span>
                <span className="text-gray-900 font-mono">{currentRole || 'none'}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Hash:</span>
                <span className="text-gray-900 font-mono">{location.hash || 'none'}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Search:</span>
                <span className="text-gray-900 font-mono">{location.search || 'none'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReduxDebug;

