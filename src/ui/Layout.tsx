"use client";

import { useState } from "react";
import { Toolbar } from "./Toolbar";
import { Sidebar } from "./Sidebar";
import { Timeline } from "./Timeline";
import { SettingsDialog } from "./SettingsDialog";
import { ViewportManager } from "@/core/engine/ViewportManager";
import { ChatPanel } from "@/ai/ChatPanel";
import { ActivePluginToolbar } from "./ActivePluginToolbar";

export function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-900">
      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <ViewportManager />
          <ActivePluginToolbar />

          {/* Quick Action Buttons */}
          <div className="absolute bottom-2 right-2 z-10 flex gap-1">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="px-2 py-1 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-600 transition-colors"
              title="AI Chat"
            >
              AI
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-2 py-1 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-600 transition-colors"
              title="Settings"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* AI Chat Panel */}
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>

      {/* Footer Timeline */}
      <Timeline />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
