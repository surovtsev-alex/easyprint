"use client";

import { useState, useEffect } from "react";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [aiEndpoint, setAiEndpoint] = useState("");
  const [aiModel, setAiModel] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAiEndpoint(localStorage.getItem("ep_ai_endpoint") || "");
      setAiModel(localStorage.getItem("ep_ai_model") || "");
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("ep_ai_endpoint", aiEndpoint);
    localStorage.setItem("ep_ai_model", aiModel);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-2xl max-w-md w-full mx-4">
        <h2 className="text-white text-lg font-semibold mb-4">Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-1">
              AI Endpoint URL
            </label>
            <input
              type="url"
              value={aiEndpoint}
              onChange={(e) => setAiEndpoint(e.target.value)}
              placeholder="https://api.example.com/v1/chat/completions"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              OpenAI-compatible endpoint for AI chat
            </p>
          </div>

          <div>
            <label className="text-gray-300 text-sm block mb-1">
              Model Name
            </label>
            <input
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gpt-4, claude-3.5-sonnet, etc."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
