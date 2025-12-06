import React, { useState } from 'react';

const defaultCameras = [
  { id: 1, name: 'Camera #1', url: '' },
  { id: 2, name: 'Camera #2', url: '' },
  { id: 3, name: 'Camera #3', url: '' },
  { id: 4, name: 'Camera #4', url: '' },
];

const PfCctvView = () => {
  const [cameras, setCameras] = useState(defaultCameras);

  const updateUrl = (id, url) => {
    setCameras((prev) => prev.map((cam) => (cam.id === id ? { ...cam, url } : cam)));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">CCTV Live View (placeholder)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Layout reserved for future CCTV integration. URLs are stored only in memory for this session.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        {cameras.map((cam) => (
          <div key={cam.id} className="rounded-lg border bg-black/90 text-slate-100 p-3 flex flex-col gap-2 h-64">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">{cam.name}</span>
              <span className="text-slate-400 text-[11px]">RTSP/HTTP URL (placeholder)</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-700 rounded-md bg-black/60">
              <span>No live feed – UI placeholder only</span>
            </div>
            <input
              type="text"
              value={cam.url}
              onChange={(e) => updateUrl(cam.id, e.target.value)}
              placeholder="rtsp:// or http:// camera URL (not persisted)"
              className="mt-1 w-full rounded border border-slate-600 bg-black/40 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PfCctvView;
