import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../App';

const CCTVLiveView = () => {
  const { user } = useAuth();
  const [selectedCamera, setSelectedCamera] = useState('all');

  // Camera locations - will be configured with actual CCTV feed URLs
  const cameras = [
    { id: 'cam1', name: 'Main Entrance', location: 'Ground Floor', status: 'active' },
    { id: 'cam2', name: 'Loading Bay', location: 'Basement', status: 'active' },
    { id: 'cam3', name: 'Parking Area', location: 'Ground Floor', status: 'active' },
    { id: 'cam4', name: 'Reception', location: 'Ground Floor', status: 'active' },
    { id: 'cam5', name: 'Warehouse', location: '1st Floor', status: 'active' },
    { id: 'cam6', name: 'Server Room', location: '2nd Floor', status: 'active' },
    { id: 'cam7', name: 'Emergency Exit 1', location: 'Ground Floor', status: 'active' },
    { id: 'cam8', name: 'Emergency Exit 2', location: '1st Floor', status: 'active' },
  ];

  const getStatusBadge = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-red-100 text-red-800 border-red-300';
  };

  const filteredCameras = selectedCamera === 'all' 
    ? cameras 
    : cameras.filter(cam => cam.id === selectedCamera);

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CCTV Live View</h1>
              <p className="text-gray-600 mt-1">Real-time surveillance monitoring</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Viewing as: <span className="font-semibold text-purple-600">{user?.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-green-600 font-medium">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Selection */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Camera View
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Cameras (Grid View)</option>
            {cameras.map(cam => (
              <option key={cam.id} value={cam.id}>
                {cam.name} - {cam.location}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Grid */}
        <div className={`grid gap-6 ${selectedCamera === 'all' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredCameras.map((camera) => (
            <div key={camera.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Camera Info */}
              <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{camera.name}</h3>
                  <p className="text-xs text-gray-400">{camera.location}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusBadge(camera.status)}`}>
                  {camera.status === 'active' ? '● LIVE' : '● OFFLINE'}
                </span>
              </div>

              {/* Camera Feed Placeholder */}
              <div className={`${selectedCamera === 'all' ? 'aspect-video' : 'aspect-video md:aspect-[16/9]'} bg-gray-900 relative`}>
                {/* Placeholder for CCTV feed */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">📹</span>
                    <p className="text-white font-medium">CCTV Feed Placeholder</p>
                    <p className="text-gray-400 text-sm mt-2">Camera ID: {camera.id}</p>
                    <p className="text-gray-500 text-xs mt-4 px-4">
                      Configure camera feed URL in backend
                    </p>
                  </div>
                </div>

                {/* Timestamp Overlay */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 text-xs font-mono rounded">
                  {new Date().toLocaleString()}
                </div>

                {/* Camera Controls Overlay */}
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded transition-colors" title="Zoom In">
                    🔍+
                  </button>
                  <button className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded transition-colors" title="Zoom Out">
                    🔍-
                  </button>
                  <button className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded transition-colors" title="Fullscreen">
                    ⛶
                  </button>
                </div>
              </div>

              {/* Camera Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t flex gap-2">
                <button className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  📸 Snapshot
                </button>
                <button className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                  ⏺ Record
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">CCTV System Configuration</h3>
              <p className="text-sm text-blue-800 mb-2">
                This page displays live CCTV camera feeds for security monitoring. To configure actual camera feeds:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Add camera feed URLs in the backend configuration</li>
                <li>Integrate with your CCTV/NVR system (RTSP, HLS, or WebRTC)</li>
                <li>Configure recording and snapshot storage</li>
                <li>Set up motion detection alerts</li>
              </ul>
              <p className="text-xs text-blue-700 mt-3 font-medium">
                🔒 Access restricted to Procurement Managers and Administrators only
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CCTVLiveView;
